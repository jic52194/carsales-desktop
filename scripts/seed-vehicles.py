# Seeds a tenant's vehicles through the REST API as a signed-in user (RLS enforced — proves policies work).
import json, sys, urllib.request, os
URL = "https://suooupofqybiojouttxe.supabase.co"
KEY = "sb_publishable_kQrB2hPMjcjuYI1N8mb0Ww_wEf0SzFC"
user, pw, path = sys.argv[1], sys.argv[2], sys.argv[3]
def req(p, data=None, token=None, method=None, extra=None):
    h = {"apikey": KEY, "Content-Type": "application/json", "Authorization": f"Bearer {token or KEY}"}
    if extra: h.update(extra)
    r = urllib.request.Request(URL + p, data=json.dumps(data).encode() if data is not None else None, headers=h, method=method or ("POST" if data is not None else "GET"))
    try:
        with urllib.request.urlopen(r, timeout=60) as resp: return resp.status, json.loads(resp.read() or b"null")
    except urllib.error.HTTPError as e: return e.code, e.read().decode()
s, email = req("/rest/v1/rpc/email_for_username", {"p_username": user})
print("email_for_username:", s, email)
s, sess = req("/auth/v1/token?grant_type=password", {"email": email, "password": pw})
assert s == 200, sess
tok = sess["access_token"]; print("signed in as", sess["user"]["email"])
s, me = req("/rest/v1/rpc/me", {}, tok); print("me():", s, me["profile"]["role"], me["tenant"]["name"])
rows = json.load(open(path))
out = []
for v in rows:
    out.append({"stock_number": v["stockNumber"], "vin": v["vin"] or None, "year": v["year"], "make": v["make"], "model": v["model"], "trim": v.get("trim") or "",
        "body_style": v.get("bodyStyle"), "mileage": v.get("mileage") or 0, "price": v.get("price"), "cost": None,
        "exterior_color": v.get("exteriorColor"), "interior_color": v.get("interiorColor"), "transmission": v.get("transmission"), "drivetrain": v.get("drivetrain"),
        "engine": v.get("engine"), "fuel_type": v.get("fuelType"), "mpg": v.get("mpg"), "images": v.get("images") or [], "source_url": v.get("sourceUrl"),
        "description": v.get("description"), "features": v.get("features") or [], "status": "Available", "source": v.get("source"), "external_id": v["id"]})
for i in range(0, len(out), 50):
    s, r = req("/rest/v1/vehicles?on_conflict=tenant_id,stock_number", out[i:i+50], tok, extra={"Prefer": "resolution=merge-duplicates,return=minimal"})
    print("batch", i, s, r if s >= 300 else "ok")
s, cnt = req("/rest/v1/vehicles?select=id", None, tok, extra={"Prefer": "count=exact", "Range": "0-0"}); print("count query:", s)
s, c = req("/rest/v1/rpc/me", {}, tok)
import urllib.request as u
r = u.Request(URL + "/rest/v1/vehicles?select=count", headers={"apikey": KEY, "Authorization": f"Bearer {tok}"}); print("vehicles visible:", json.loads(u.urlopen(r).read()))
