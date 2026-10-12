import json, re, sys
src, out = sys.argv[1], sys.argv[2]
d = json.load(open(src))
rows = []
for v in d["inventory"]:
    price = v.get("price")
    vdp = re.search(r"/vdp/(\d+)/", v.get("detailUrl") or "")
    vid = f"bp-{vdp.group(1)}" if vdp else f"bp-{v['stockNumber']}"
    photos = [p for p in (v.get("photoUrls") or []) if p and "nophoto" not in p]
    rows.append({
        "id": vid,
        "tenantId": "bestprice",
        "stockNumber": v["stockNumber"],
        "vin": v.get("vin") or "",
        "year": v["year"], "make": v["make"], "model": v["model"], "trim": v.get("trim") or "",
        "bodyStyle": v.get("bodyStyle"),
        "mileage": v.get("mileage") or 0,
        "price": price,                      # null = "Get ePrice"
        "cost": None,                        # dealer enters real cost; unknown from website
        "exteriorColor": v.get("exteriorColor"), "interiorColor": v.get("interiorColor"),
        "transmission": v.get("transmission"), "drivetrain": v.get("drivetrain"),
        "engine": v.get("engine"), "fuelType": (v.get("fuelType") or "").replace(" (assumed)", ""),
        "mpg": v.get("mpg"),
        "images": photos,
        "sourceUrl": v.get("detailUrl"),
        "description": v.get("description") or "",
        "features": v.get("features") or [],
        "status": "Available",
        "source": "bestpriceautosales.net (Dealer Car Search) — imported 2026-10-12",
    })
json.dump(rows, open(out, "w"), indent=0)
print(len(rows), "vehicles →", out)
