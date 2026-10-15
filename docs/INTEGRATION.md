# חיבור למערכת חיצונית (למשל מערכת ניהול ההסעות)

כשהצעה מאושרת — ע״י הלקוח בקישור, או כשמשנים סטטוס ל"אושרה" — המערכת שולחת `POST` לכתובת שמוגדרת ב"פרטי העסק ← חיבור למערכת חיצונית".

## כותרות
- `content-type: application/json`
- `x-quotecraft-event: quote.approved`
- `x-quotecraft-signature`: HMAC-SHA256 (hex) של גוף הבקשה, עם מפתח החתימה של העסק

## גוף הבקשה (דוגמה)
```json
{
  "event": "quote.approved",
  "sent_at": "2026-11-01T09:12:00.000Z",
  "business": { "id": "…", "name": "הסעות הגליל" },
  "quote": {
    "id": "…", "number": "Q-1012", "title": "הסעה לירושלים – 12.11.2026",
    "status": "approved", "approved_by": "שרית מזרחי", "approved_at": "…",
    "subtotal": 2800, "discount": 0, "vat": 504, "total": 3304, "currency": "ILS",
    "items": [{ "description": "הסעה הלוך-חזור – 48 נוסעים", "quantity": 1, "unit_price": 2800 }]
  },
  "client": { "name": "תיכון אורט חיפה", "contact": "שרית מזרחי", "phone": "04-8123456", "email": "sarit@ort-haifa.org.il" },
  "trip": {
    "origin": "חיפה, רח׳ הנביאים 20", "destination": "ירושלים, תיאטרון ירושלים",
    "date": "2026-11-12", "time": "07:30", "passengers": 48,
    "round_trip": true, "return_time": "17:00", "stops": null
  },
  "sales_rep": { "full_name": "דני כהן", "email": "…", "phone": "…" }
}
```

## אימות החתימה בצד המקבל (Node.js)
```js
const sig = crypto.createHmac("sha256", SECRET).update(rawBody).digest("hex");
if (sig !== req.headers["x-quotecraft-signature"]) return res.status(401).end();
```

## כל שליחה נרשמת
טבלת `webhook_deliveries` (קוד תשובה, הצלחה/כישלון). בדף ההצעה מוצג הסטטוס, ויש כפתור "שליחה חוזרת".
