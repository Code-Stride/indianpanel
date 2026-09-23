#!/usr/bin/env python3
"""Executed on a GitHub Actions runner (open internet) against the shared host.

Modes:
  --mode recon   : non-destructive inspection, finds the document root
  --mode deploy  : upload the static site (tar-backup first when on SSH)

Transport: tries SSH/SFTP (paramiko) first; if SSH authentication is refused,
falls back to plain FTP (ftplib, passive mode) which shared hosts such as
DNSExit/DirectAdmin normally allow with the same panel credentials.
The password is read from a 0600 file and never printed.
"""
import argparse, ftplib, json, os, posixpath, socket, sys, time

try:
    import paramiko
except ImportError:
    print("paramiko missing; install it before running this", file=sys.stderr)
    raise

DOCROOT_NAMES = {"public_html", "httpdocs", "htdocs", "www", "web", "webroot"}

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


# ---------------------------------------------------------------- SSH transport
def connect(cfg, pw):
    sock = socket.create_connection((cfg["host"], cfg["port"]), timeout=30)
    t = paramiko.Transport(sock)
    t.set_keepalive(20)
    t.start_client(timeout=30)
    user = cfg["user"]

    methods = []
    try:
        t.auth_none(user)
    except paramiko.BadAuthenticationType as e:
        methods = list(e.allowed_types or [])
    except Exception:
        pass
    print(f"[ssh] server advertises auth methods: {methods or 'unknown'}")

    def kbd(title, instructions, prompt_list):
        return [pw for _ in prompt_list]

    reasons = []
    if not t.is_authenticated():
        try:
            t.auth_password(user, pw)
            print("[ssh] auth_password ok")
        except Exception as e:
            reasons.append(f"password:{type(e).__name__}")
    if not t.is_authenticated() and "keyboard-interactive" in methods:
        try:
            t.auth_interactive(user, kbd)
            print("[ssh] auth_interactive ok")
        except Exception as e:
            reasons.append(f"kbd:{type(e).__name__}")
    if not t.is_authenticated():
        raise RuntimeError("ssh authentication rejected (" + ", ".join(reasons) + ")")
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
    for p in cands:
        if domain and domain in p.lower():
            return p
    for p in cands:
        if label and label in p.lower():
            return p
    for p in cands:
        if p.rstrip("/").split("/")[-1] in DOCROOT_NAMES:
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


# ---------------------------------------------------------------- FTP fallback
def ftp_login(cfg, pw):
    dom = cfg.get("domain") or ""
    users = [cfg["user"]]
    if dom:
        users += [f"{cfg['user']}@{dom}", f"{cfg['user']}%{dom}"]
    fails = []
    f = ftplib.FTP(timeout=40)
    for u in users:
        try:
            f.connect(cfg["host"], int(cfg.get("ftp_port", 21)), timeout=30)
            f.login(u, pw)
            f.set_pasv(True)
            f.sendcmd("TYPE I")
            print(f"[ftp] login ok as {u!r} (cwd={f.pwd()})")
            return f
        except Exception as e:
            fails.append(f"{u}: {type(e).__name__}: {str(e)[:120]}")
            print("[ftp] attempt failed:", fails[-1])
            try:
                f.close()
            except Exception:
                pass
            f = ftplib.FTP(timeout=40)
    raise RuntimeError("ftp authentication rejected (" + " | ".join(fails) + ")")


def ftp_dirs(f, base):
    """Names of subdirectories directly inside absolute path `base`."""
    out = []
    try:
        f.cwd(base)
    except Exception:
        return out
    lines = []
    try:
        f.dir(lambda l: lines.append(l))
    except Exception:
        return out
    for l in lines:
        parts = l.split(None, 8)
        if len(parts) == 9 and parts[0].startswith("d"):
            out.append(parts[8])
    return out


def ftp_walk_candidates(f, base, depth=2):
    cands = []
    for d in ftp_dirs(f, base):
        p = posixpath.join(base, d)
        if d in DOCROOT_NAMES:
            cands.append(p)
        elif depth > 0 and d in ("domains", "subdomains", "sites"):
            for sub in ftp_dirs(f, p):
                sp = posixpath.join(p, sub)
                for dd in ftp_dirs(f, sp):
                    if dd in DOCROOT_NAMES:
                        cands.append(posixpath.join(sp, dd))
                    elif d in ("domains", "subdomains") and dd in ("public_html",):
                        cands.append(posixpath.join(sp, dd))
    # dedupe, keep order
    seen = set()
    return [c for c in cands if not (c in seen or seen.add(c))]


def ftp_ls(f, path):
    """LIST lines at absolute path (or [] if unreachable)."""
    cur = f.pwd()
    try:
        f.cwd(path)
        lines = []
        f.dir(lambda l: lines.append(l))
        return lines
    except Exception:
        return []
    finally:
        try:
            f.cwd(cur)
        except Exception:
            pass


def ftp_probe_candidates(f, cfg):
    """Probed, definitely-existing webroot candidates (absolute, cwd-relative)."""
    user = cfg["user"]
    dom = cfg.get("domain") or ""
    base = f.pwd() or "/"
    probes = []
    seen = set()

    def add(p):
        p = posixpath.normpath(p)
        if p not in seen:
            seen.add(p)
            probes.append(p)

    rels = ("public_html", "httpdocs", "htdocs", "www", "web", "webroot",
            "public_shtml", f"domains/{dom}/public_html", f"domains/{dom}/httpdocs",
            f"domains/{dom}", "domains", "")
    for l in ftp_ls(f, "/"):
        parts = l.split(None, 8)
        if len(parts) == 9 and parts[0].startswith("d") and parts[8] not in (".", "..", "tmp", "MyFiles"):
            add("/" + parts[8])
            for rel in ("public_html", "httpdocs", "htdocs"):
                add(posixpath.join("/" + parts[8], rel))
    extra_bases = [base, "/"]
    for b in ("/home/" + user, "/home/" + user):
        extra_bases.append(b)
        for sub in ("public_html", "httpdocs", f"domains/{dom}/public_html", f"domains/{dom}/httpdocs", f"domains/{dom}", ""):
            add(posixpath.join(b, sub) if sub else b)
    for b in extra_bases:
        for rel in rels:
            add(posixpath.join(b, rel) if rel else b)
    cands = []
    for p in probes:
        lines = ftp_ls(f, p)
        if lines is None:
            continue
        entries = [l for l in lines if True]
        if not entries and p not in ("/",):
            continue
        name = p.rstrip("/").split("/")[-1]
        weblike = name in DOCROOT_NAMES or any(
            (l.split(None, 8)[8] if len(l.split(None, 8)) == 9 else "") in
            ("index.html", "index.php", "index.htm", ".htaccess", "default.html")
            for l in entries)
        if weblike or (p in ("/", base) and entries):
            cands.append((p, len(entries)))
    out = []
    for p, n in cands:
        print(f"CANDIDATE {p} entries={n}")
        out.append(p)
    return out


def ftp_recon(f, cfg):
    base = f.pwd()
    dom = cfg.get("domain") or ""
    print(f"=== FTP recon (login cwd: {base}) ===")
    probes = [base, "/", "/home", "/home/" + cfg["user"], "/var/www"]
    # DNSExit-style virtualhost layout: /<domain>/... — walk one level in
    for l in ftp_ls(f, "/"):
        parts = l.split(None, 8)
        if len(parts) == 9 and parts[0].startswith("d") and parts[8] not in (".", "..", "tmp", "MyFiles"):
            d = parts[8]
            probes.append(posixpath.join("/", d))
            for l2 in ftp_ls(f, posixpath.join("/", d)):
                p2 = l2.split(None, 8)
                if len(p2) == 9 and p2[0].startswith("d") and p2[8] not in (".", ".."):
                    probes.append(posixpath.join("/", d, p2[8]))
    for probe in probes:
        lines = ftp_ls(f, probe)
        print(f"--- LIST {probe} ({len(lines)} entries) ---")
        print("\n".join(lines[:60]))
    print("=== candidate probes ===")
    ftp_probe_candidates(f, cfg)
    print("=== RECON_DONE ===")


def ftp_mkdir_p(f, path):
    parts = path.strip("/").split("/")
    f.cwd("/")
    for p in parts:
        try:
            f.cwd(p)
        except ftplib.error_perm:
            try:
                f.mkdir(p)
                f.cwd(p)
            except Exception as e:
                print(f"[ftp] cannot enter/create {p}: {e}")
                return False
    return True


def ftp_upload(f, local_dir, webroot):
    nfiles = 0
    for root, dirs, files in os.walk(local_dir):
        rel = os.path.relpath(root, local_dir)
        rdir = webroot if rel == "." else posixpath.join(webroot, rel.replace(os.sep, "/"))
        if not ftp_mkdir_p(f, rdir):
            raise RuntimeError(f"cannot prepare remote dir {rdir}")
        for d in dirs:
            try:
                f.mkdir(posixpath.join(rdir, d))
            except Exception:
                pass
        for fn in files:
            lp = os.path.join(root, fn)
            with open(lp, "rb") as fh:
                f.storbinary(f"STOR {posixpath.basename(fn)}", fh)
            nfiles += 1
            if nfiles % 10 == 0:
                print(f"  uploaded {nfiles} files ...")
    return nfiles


def ftp_deploy(f, cfg, dist):
    print("=== probing webroots over FTP ===")
    cands = ftp_probe_candidates(f, cfg)
    det = "\n".join(f"DOCROOT_CANDIDATE {c}" for c in cands) + "\nDETECT_DONE"
    print("=== webroot detection (ftp) ===")
    print(det)
    webroot = choose_webroot(cfg, det)
    if not webroot:
        print("ERROR: could not determine document root over FTP")
        sys.exit(4)
    if not os.path.isdir(dist):
        print(f"ERROR: local dist dir not found: {dist}")
        sys.exit(5)
    print(f"using webroot: {webroot}")
    if not ftp_mkdir_p(f, webroot):
        print("ERROR: cannot enter/create webroot over FTP")
        sys.exit(6)
    existing = []
    try:
        f.dir(lambda l: existing.append(l))
    except Exception:
        pass
    print(f"(pre-existing entries in webroot: {len(existing)})")
    n = ftp_upload(f, dist, webroot)
    print(f"uploaded {n} files to {webroot}")
    try:
        f.cwd(webroot)
        names = f.nlst()
        need = ["index.html", "TEAM_ABHI_Pannel_1786263630516.html"]
        for x in need:
            print(f"  remote check {x}: {'OK' if x in names else 'MISSING'}")
    except Exception as e:
        print("post-check failed:", e)
    print("DEPLOY_DONE")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", required=True, choices=["recon", "deploy"])
    ap.add_argument("--pw-file", required=True)
    ap.add_argument("--config", default=".deploy/host_config.json")
    ap.add_argument("--dist", default="dist")
    a = ap.parse_args()

    cfg = json.load(open(a.config))
    pw = open(a.pw_file, "rb").read().decode().strip()

    t = None
    try:
        t = connect(cfg, pw)
    except Exception as e:
        print(f"[ssh] unavailable: {e}")
        print("[fallback] trying FTP on port 21 ...")

    if t is not None:
        try:
            if a.mode == "recon":
                rc, out, err = run(t, RECON_SH)
                print(out)
                if err.strip():
                    print("[stderr]\n" + err)
                print(f"[recon exit {rc}]")
                return

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
        return

    # ---- FTP path ----
    f = ftp_login(cfg, pw)
    try:
        if a.mode == "recon":
            ftp_recon(f, cfg)
        else:
            ftp_deploy(f, cfg, a.dist)
    finally:
        try:
            f.quit()
        except Exception:
            pass


if __name__ == "__main__":
    main()
