import sys, json
c = json.load(sys.stdin)
env = c[0]["Config"]["Env"]
for x in env:
    if "PASS" in x.upper() or "ADMIN" in x.upper() or "SUPER" in x.upper() or "DJANGO" in x.upper():
        print(x)
