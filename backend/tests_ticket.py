import os, json, sys, urllib.request
from dotenv import load_dotenv; load_dotenv("/app/backend/.env")
req=urllib.request.Request('https://api.clerk.com/v1/sign_in_tokens',data=json.dumps({'user_id':sys.argv[1],'expires_in_seconds':3600}).encode(),method='POST',headers={'Authorization':'Bearer '+os.environ['CLERK_SECRET_KEY'],'Content-Type':'application/json','User-Agent':'t'})
print(json.load(urllib.request.urlopen(req))['token'])
