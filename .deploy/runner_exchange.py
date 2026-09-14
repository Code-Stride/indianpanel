#!/usr/bin/env python3
"""Runs on the GitHub runner. Ephemeral RSA key exchange (see repo README)."""
import argparse, base64, hashlib, json, os, subprocess, sys, time, urllib.request, urllib.error

REPO = os.environ["GITHUB_REPOSITORY"]
BR   = os.environ.get("BRANCH", "arena/01a09ed6-indianpanel")
TOK  = os.environ["GITHUB_TOKEN"]
API  = os.environ.get("GITHUB_API_URL", "https://api.github.com")
RAW  = os.environ.get("RAW_API", "https://raw.githubusercontent.com")
PUB, SEC, DBG = ".exch/pub.pem", ".exch/sec.b64", ".exch/runner-debug.log"
H = {"Authorization": f"Bearer {TOK}", "Accept": "application/vnd.github+json",
     "User-Agent": "runner-exchange", "X-GitHub-Api-Version": "2022-11-28"}
LOG = []

def log(*a):
    line = " ".join(str(x) for x in a)
    print(line, flush=True)
    LOG.append(line)

def api(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method, headers=H)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:  # noqa
        return 0, str(e).encode()

def get_file(path):
    st, b = api("GET", f"/repos/{REPO}/contents/{path}?ref={BR}")
    if st == 200:
        j = json.loads(b)
        return base64.b64decode(j["content"]), j["sha"], st
    return None, None, st

def put_file(path, content, msg):
    _, sha, _ = get_file(path)
    body = {"message": msg, "branch": BR, "content": base64.b64encode(content).decode()}
    if sha: body["sha"] = sha
    st, _ = api("PUT", f"/repos/{REPO}/contents/{path}", body)
    return st

def del_file(path, msg):
    _, sha, _ = get_file(path)
    if not sha: return 404
    st, _ = api("DELETE", f"/repos/{REPO}/contents/{path}",
                {"message": msg, "branch": BR, "sha": sha})
    return st

def publish_debug():
    try:
        put_file(DBG, ("\n".join(LOG)).encode(), "chore: runner exchange debug [skip ci]")
    except Exception as e:
        print("debug publish failed:", e)

def get_via_raw(path):
    url = f"{RAW}/{REPO}/{BR}/{path}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOK}",
                                               "User-Agent": "runner-exchange"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:  # noqa
        return 0, str(e).encode()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--secret-out", required=True)
    ap.add_argument("--wait", type=int, default=300)
    a = ap.parse_args()
    log("openssl:", subprocess.run(["openssl","version"],capture_output=True,text=True).stdout.strip())
    log("repo", REPO, "branch", BR)

    log("clearing stale exchange files ...")
    del_file(SEC, "chore: clear exchange ciphertext [skip ci]")
    del_file(PUB, "chore: clear exchange pubkey [skip ci]")
    time.sleep(2)

    priv = subprocess.run(["openssl", "genpkey", "-algorithm", "RSA",
                           "-pkeyopt", "rsa_keygen_bits:2048"],
                          capture_output=True, check=True).stdout
    pub = subprocess.run(["openssl", "pkey", "-pubout"],
                         input=priv, capture_output=True, check=True).stdout
    log("pubkey sha256:", hashlib.sha256(pub).hexdigest()[:16], "len", len(pub))
    st = put_file(PUB, pub, "chore: publish ephemeral deploy pubkey [skip ci]")
    log("publish pubkey:", st)
    if st not in (200, 201):
        publish_debug(); sys.exit(2)

    secret = None
    deadline = time.time() + a.wait
    last_err = ""
    with open("/tmp/eh_priv.pem", "wb") as f:
        f.write(priv)
    os.chmod("/tmp/eh_priv.pem", 0o600)
    while time.time() < deadline:
        c, _, gst = get_file(SEC)
        if c:
            rstat, raw = get_via_raw(SEC)
            log("sec via api: st", gst, "bytes", len(c), "sha", hashlib.sha256(c).hexdigest()[:16],
                "| raw: st", rstat, "bytes", len(raw) if isinstance(raw,(bytes,bytearray)) else "?")
            candidates = [c]
            if isinstance(raw, (bytes, bytearray)) and rstat == 200:
                candidates.append(raw)
                try:
                    candidates.append(base64.b64decode(c))
                except Exception:
                    pass
            for i, blob in enumerate(candidates):
                with open("/tmp/eh_ct.bin", "wb") as f:
                    f.write(blob)
                r = subprocess.run(
                    ["openssl", "pkeyutl", "-decrypt", "-inkey", "/tmp/eh_priv.pem",
                     "-pkeyopt", "rsa_padding_mode:oaep",
                     "-pkeyopt", "rsa_oaep_md:sha256", "-in", "/tmp/eh_ct.bin"],
                    capture_output=True)
                if r.returncode == 0 and r.stdout:
                    secret = r.stdout
                    log(f"decrypt ok with candidate {i}: {len(blob)} ct bytes -> {len(secret)} secret bytes")
                    break
                last_err = r.stderr.decode().strip()
            if secret:
                break
            log("decrypt failed; openssl:", last_err[:220])
            publish_debug()
        time.sleep(5)

    del_file(SEC, "chore: remove exchange ciphertext [skip ci]")
    del_file(PUB, "chore: remove exchange pubkey [skip ci]")
    for p in ("/tmp/eh_priv.pem", "/tmp/eh_ct.bin"):
        try: os.remove(p)
        except OSError: pass

    if not secret:
        log("TIMEOUT waiting for usable encrypted secret")
        publish_debug(); sys.exit(3)
    # remove debug once healthy
    try: del_file(DBG, "chore: remove debug [skip ci]")
    except Exception: pass
    with open(a.secret_out, "wb") as f:
        f.write(secret)
    os.chmod(a.secret_out, 0o600)
    print(f"::add-mask::{secret.decode('utf-8','replace')}")
    log(f"exchange complete: {len(secret)} bytes")

if __name__ == "__main__":
    main()
