#!/usr/bin/env python3
"""Runs on the GitHub runner. Generates an ephemeral RSA key, publishes the
PUBLIC key to the branch, waits for ciphertext created by the operator's
sandbox, decrypts the secret in memory, writes it to a 0600 file, then removes
both exchange files. Private key and plaintext never leave the runner."""
import argparse, base64, json, os, subprocess, sys, time, urllib.request, urllib.error

REPO = os.environ["GITHUB_REPOSITORY"]
BR   = os.environ.get("BRANCH", "arena/01a09ed6-indianpanel")
TOK  = os.environ["GITHUB_TOKEN"]
API  = os.environ.get("GITHUB_API_URL", "https://api.github.com")
PUB, SEC = ".exch/pub.pem", ".exch/sec.b64"
H = {"Authorization": f"Bearer {TOK}", "Accept": "application/vnd.github+json",
     "User-Agent": "runner-exchange", "X-GitHub-Api-Version": "2022-11-28"}

def api(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method, headers=H)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()

def get_file(path):
    st, b = api("GET", f"/repos/{REPO}/contents/{path}?ref={BR}")
    if st == 200:
        j = json.loads(b)
        return base64.b64decode(j["content"]), j["sha"]
    return None, None

def put_file(path, content, msg):
    _, sha = get_file(path)
    body = {"message": msg, "branch": BR, "content": base64.b64encode(content).decode()}
    if sha: body["sha"] = sha
    st, b = api("PUT", f"/repos/{REPO}/contents/{path}", body)
    return st

def del_file(path, msg):
    _, sha = get_file(path)
    if not sha: return 404
    st, _ = api("DELETE", f"/repos/{REPO}/contents/{path}",
                {"message": msg, "branch": BR, "sha": sha})
    return st

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--secret-out", required=True)
    ap.add_argument("--wait", type=int, default=300)
    a = ap.parse_args()

    print("clearing stale exchange files ...")
    del_file(SEC, "chore: clear exchange ciphertext [skip ci]")
    del_file(PUB, "chore: clear exchange pubkey [skip ci]")
    time.sleep(2)

    priv = subprocess.run(["openssl", "genpkey", "-algorithm", "RSA",
                           "-pkeyopt", "rsa_keygen_bits:2048"],
                          capture_output=True, check=True).stdout
    pub = subprocess.run(["openssl", "pkey", "-pubout"],
                         input=priv, capture_output=True, check=True).stdout
    st = put_file(PUB, pub, "chore: publish ephemeral deploy pubkey [skip ci]")
    print("publish pubkey:", st)
    if st not in (200, 201):
        print("could not publish pubkey"); sys.exit(2)

    secret = None
    deadline = time.time() + a.wait
    while time.time() < deadline:
        c, _ = get_file(SEC)
        if c:
            try:
                # get_file() already decoded the API content field; the committed
                # file is the raw ciphertext. Tolerate an extra base64 layer too.
                ct = c
                with open("/tmp/eh_priv.pem", "wb") as f:
                    f.write(priv)
                os.chmod("/tmp/eh_priv.pem", 0o600)
                with open("/tmp/eh_ct.bin", "wb") as f:
                    f.write(ct)
                def attempt(blob):
                    with open("/tmp/eh_ct.bin", "wb") as f:
                        f.write(blob)
                    return subprocess.run(
                        ["openssl", "pkeyutl", "-decrypt", "-inkey", "/tmp/eh_priv.pem",
                         "-pkeyopt", "rsa_padding_mode:oaep",
                         "-pkeyopt", "rsa_oaep_md:sha256", "-in", "/tmp/eh_ct.bin"],
                        capture_output=True)
                r = attempt(ct)
                if r.returncode != 0:
                    try:
                        r2 = attempt(base64.b64decode(c, validate=False))
                        if r2.returncode == 0:
                            r = r2
                    except Exception:
                        pass
                if r.returncode == 0 and r.stdout:
                    secret = r.stdout
                    print(f"decrypt ok: ciphertext {len(ct)} bytes")
                    break
                else:
                    print("decrypt not ready yet:", r.stderr.decode()[:200])
            except Exception as e:
                print("exchange parse error:", e)
        time.sleep(5)

    # cleanup exchange artifacts ASAP
    del_file(SEC, "chore: remove exchange ciphertext [skip ci]")
    del_file(PUB, "chore: remove exchange pubkey [skip ci]")
    for p in ("/tmp/eh_priv.pem", "/tmp/eh_ct.bin"):
        try: os.remove(p)
        except OSError: pass

    if not secret:
        print("TIMEOUT waiting for encrypted secret"); sys.exit(3)
    with open(a.secret_out, "wb") as f:
        f.write(secret)
    os.chmod(a.secret_out, 0o600)
    # mask it in Actions logs
    print(f"::add-mask::{secret.decode('utf-8','replace')}")
    print(f"exchange complete: received secret, {len(secret)} bytes")

if __name__ == "__main__":
    main()
