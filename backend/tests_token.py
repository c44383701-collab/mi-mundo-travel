import os, json, sys, urllib.request
from dotenv import load_dotenv; load_dotenv("/app/backend/.env")
SK=os.environ["CLERK_SECRET_KEY"]
def bapi(path, body):
    req=urllib.request.Request("https://api.clerk.com/v1"+path, data=json.dumps(body).encode(), method="POST",
        headers={"Authorization":"Bearer "+SK,"Content-Type":"application/json","User-Agent":"emergent-test"})
    return json.load(urllib.request.urlopen(req))
uid=sys.argv[1]
s=bapi("/sessions",{"user_id":uid})
print(bapi(f"/sessions/{s['id']}/tokens",{"expires_in_seconds":1800})["jwt"])
