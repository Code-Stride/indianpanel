#!/usr/bin/env python3
"""Executed on a GitHub Actions runner (open internet) against the shared host.
Supports:
  --mode recon   : non-destructive inspection, finds document root
  --mode deploy  : back up current docroot, then SFTP-upload the static site

The SSH password is read from a 0600 file and never printed."""
import argparse, json, os, posixpath, socket, stat, sys, time

try:
    import paramiko
except ImportError:
    print("paramiko missing; install it before running this", file=sys.stderr)
    raise

RECON_SH = r'''
set +e
echo "=== identity ==="
id
echo "HOME=$HOME"
pwd
uname -a
[ -f /etc/os-release ] && head -5 /etc/os-release
echo "SHELL=$SHELL"
echo "=== home listing ==="
ls -la "$HOME"
echo "=== candidate docroots ==="
for d in public_html httpdocs htdocs www web webroot sites domains domains/blazepanel.mywp.info/public_html domains/blazepanel/public_html domains/blazepanel.mywp.info; do
  if [ -e "$HOME/$d" ]; then
    echo "--- FOUND: $HOME/$d ---"
    ls -la "$HOME/$d" | head -60
  fi
done
echo "=== find docroot-like dirs (maxdepth 5) ==="
find -L "$HOME" -maxdepth 5 -type d \( -name public_html -o -name httpdocs -o -name htdocs -o -name webroot \) 2>/dev/null
echo "=== control panel hints ==="
[ -d /usr/local/cpanel ] && echo "CPANEL_PRESENT"
[ -d /usr/local/directadmin ] && echo "DIRECTADMIN_PRESENT"
[ -d /usr/local/CyberCP ] && echo "CYBERPANEL_PRESENT"
[ -d /usr/local/psa ] && echo "PLESK_PRESENT"
[ -f /etc/wwwacct.conf ] && echo "WWWACCT_PRESENT"
[ -f /usr/local/cpanel/cpanel ] && echo "CPANEL_BIN_PRESENT"
echo "=== tools ==="
for x in sh bash tar rsync gzip unzip php python3 sftp-server; do printf '%s: ' "$x"; command -v "$x" || echo MISSING; done
echo "=== default public_html contents/index ==="
if [ -d "$HOME/public_html" ]; then
  ls -la "$HOME/public_html"
  for f in index.html index.htm index.php default.html .htaccess; do
    if [ -e "$HOME/public_html/$f" ]; then echo "--- $f (head) ---"; head -c 500 "$HOME/public_html/$f"; echo; fi
  done
else
  echo "NO ~/public_html"
fi
echo "=== disk ==="
df -h "$HOME" | tail -2
echo "=== RECON_DONE ==="
'''

# compact detection used right before deploy
DETECT_SH = r'''
set +e
for d in public_html httpdocs htdocs www web webroot sites \
         domains/blazepanel.mywp.info/public_html domains/blazepanel/public_html \
         domains/blazepanel.mywp.info domains/blazepanel.mywp.info/httpdocs; do
  if [ -d "$HOME/$d" ]; then echo "DOCROOT_CANDIDATE $HOME/$d"; fi
done
find -L "$HOME" -maxdepth 5 -type d \( -name public_html -o -name httpdocs -o -name htdocs \) 2>/dev/null | sed 's/^/DOCROOT_FIND /'
echo DETECT_DONE
'''


def connect(cfg, pw):
    sock = socket.create_connection((cfg["host"], cfg["port"]), timeout=30)
    t = paramiko.Transport(sock)
    t.set_keepalive(20)
    t.start_client(timeout=30)
    user = cfg["user"]

    def kbd(title, instructions, prompt_list):
        return [pw for _ in prompt_list]

    last = None
    if not t.is_authenticated():
        try:
            t.auth_password(user, pw)
        except Exception as e:  # noqa
            last = e
    if not t.is_authenticated():
        try:
            t.auth_interactive(user, kbd)
        except Exception as e:  # noqa
            last = e
    if not t.is_authenticated():
        raise RuntimeError(f"authentication failed: {last!r}")
    print(f"authenticated as {user} on {cfg['host']}:{cfg['port']}")
    return t


def run(t, cmd, timeout=180):
    ch = t.open_session()
    ch.settimeout(timeout)
    ch.exec_command(cmd)
    out = b""
    err = b""
    while not ch.exit_status_ready():
        while ch.recv_ready():
            out += ch.recv(65536)
        while ch.recv_stderr_ready():
            err += ch.recv_stderr(65536)
        time.sleep(0.1)
    while ch.recv_ready():
        out += ch.recv(65536)
    while ch.recv_stderr_ready():
        err += ch.recv_stderr(65536)
    rc = ch.recv_exit_status()
    return rc, out.decode("utf-8", "replace"), err.decode("utf-8", "replace")


def choose_webroot(cfg, detect_out):
    if cfg.get("webroot"):
        return cfg["webroot"]
    cands = []
    for line in detect_out.splitlines():
        if line.startswith("DOCROOT_CANDIDATE ") or line.startswith("DOCROOT_FIND "):
            p = line.split(" ", 1)[1].strip()
            if p not in cands:
                cands.append(p)
    domain = (cfg.get("domain") or "").lower()
    label = domain.split(".")[0] if domain else ""
    # prefer paths that mention the domain / its label
    for p in cands:
        low = p.lower()
        if domain and domain in low:
            return p
    for p in cands:
        if label and label in p.lower():
            return p
    for p in cands:
        if p.endswith(("public_html", "httpdocs", "htdocs", "www", "web", "webroot")):
            return p
    if cands:
        return cands[0]
    return None


def ensure_dir(sftp, remote):
    parts = remote.strip("/").split("/")
    path = ""
    for p in parts:
        path += "/" + p
        try:
            sftp.stat(path)
        except FileNotFoundError:
            sftp.mkdir(path)
            try:
                sftp.chmod(path, 0o755)
            except OSError:
                pass


def upload_tree(t, local_dir, webroot):
    sftp = paramiko.SFTPClient.from_transport(t)
    nfiles = 0
    for root, dirs, files in os.walk(local_dir):
        rel = os.path.relpath(root, local_dir)
        rdir = webroot if rel == "." else posixpath.join(webroot, rel.replace(os.sep, "/"))
        ensure_dir(sftp, rdir)
        for d in dirs:
            ensure_dir(sftp, posixpath.join(rdir, d))
        for f in files:
            lp = os.path.join(root, f)
            rp = posixpath.join(rdir, f)
            sftp.put(lp, rp)
            try:
                sftp.chmod(rp, 0o644)
            except OSError:
                pass
            nfiles += 1
            if nfiles % 10 == 0:
                print(f"  uploaded {nfiles} files ...")
    sftp.close()
    return nfiles


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", required=True, choices=["recon", "deploy"])
    ap.add_argument("--pw-file", required=True)
    ap.add_argument("--config", default=".deploy/host_config.json")
    ap.add_argument("--dist", default="dist")
    a = ap.parse_args()

    cfg = json.load(open(a.config))
    pw = open(a.pw_file, "rb").read().decode().strip()

    t = connect(cfg, pw)
    try:
        if a.mode == "recon":
            rc, out, err = run(t, RECON_SH)
            print(out)
            if err.strip():
                print("[stderr]\n" + err)
            print(f"[recon exit {rc}]")
            return

        # deploy
        rc, det, err = run(t, DETECT_SH)
        print("=== webroot detection ===")
        print(det)
        webroot = choose_webroot(cfg, det)
        if not webroot:
            print("ERROR: could not determine document root; run recon first")
            sys.exit(4)
        if not os.path.isdir(a.dist):
            print(f"ERROR: local dist dir not found: {a.dist}")
            sys.exit(5)
        print(f"using webroot: {webroot}")

        # backup existing docroot (non-destructive)
        ts = time.strftime("%Y%m%d-%H%M%S")
        backup = f"$HOME/.site-backups/{ts}"
        backup_sh = (
            f'mkdir -p {backup}; '
            f'if [ -d "{webroot}" ] && [ -n "$(ls -A "{webroot}" 2>/dev/null)" ]; then '
            f'(cd "{webroot}" && tar cf - . 2>/dev/null | (cd {backup} && tar xf - 2>/dev/null)) && '
            f'echo "BACKUP_AT {backup}" || echo "BACKUP_SKIPPED"; '
            f'else echo "BACKUP_EMPTY"; fi; '
            f'mkdir -p "{webroot}"; echo READY'
        )
        rc, out, err = run(t, backup_sh, timeout=300)
        print(out.strip())
        if err.strip():
            print("[backup stderr] " + err.strip())
        if "READY" not in out:
            print("ERROR preparing webroot/backup")
            sys.exit(6)

        n = upload_tree(t, a.dist, webroot)
        print(f"uploaded {n} files to {webroot}")

        rc, ls, err = run(t, f'echo "=== post listing ==="; ls -la "{webroot}" | head -40; '
                             f'echo "=== index head ==="; head -c 200 "{webroot}/index.html"; echo; '
                             f'echo "DEPLOY_DONE"')
        print(ls)
        if err.strip():
            print("[post stderr] " + err.strip())
    finally:
        t.close()


if __name__ == "__main__":
    main()
