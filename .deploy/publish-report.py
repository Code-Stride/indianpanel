#!/usr/bin/env python3
import os, sys, base64, json, urllib.request, urllib.error, time

path = sys.argv[1]
repo = os.environ["GITHUB_REPOSITORY"]
tok  = os.environ["GITHUB_TOKEN"]
branch = "arena/01a09ed6-indianpanel"
content = open(path, "rb").read()
api = f"https://api.github.com/repos/{repo}/contents/{path}"
hdr = {"Authorization": f"Bearer {tok}", "Accept": "application/vnd.github+json",
       "Content-Type": "application/json", "User-Agent": "arena-deploy-bot",
       "X-GitHub-Api-Version": "2022-11-28"}

def call(method, url, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=hdr)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return 0, str(e)

sha = None
st, body = call("GET", api + f"?ref={branch}")
if st == 200:
    sha = json.loads(body).get("sha")
msg = f"chore: update {path} [skip ci]"
payload = {"message": msg, "branch": branch, "content": base64.b64encode(content).decode()}
if sha:
    payload["sha"] = sha
st, body = call("PUT", api, payload)
print("contents API:", st)
if st in (200, 201):
    print("report committed to branch")
    sys.exit(0)

# fallback: post as an issue comment on a tracking issue (create if needed)
print("contents API failed, trying issues fallback:", body[:500])
try:
    st2, b2 = call("POST", f"https://api.github.com/repos/{repo}/issues",
                   {"title": f"Host deploy report {time.strftime('%Y%m%d-%H%M%S')} [skip ci]",
                    "body": "```\n" + content.decode('utf-8','replace')[:60000] + "\n```"})
    print("issue create:", st2)
except Exception as e:
    print("issue fallback error:", e)
sys.exit(1 if st not in (200,201) and st2 not in (200,201) else 0)
