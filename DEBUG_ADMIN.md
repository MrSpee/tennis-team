# Debug: Admin-Button nicht sichtbar

## Im Browser Console (F12) ausführen:

```javascript
// Prüfe aktuellen User
const auth = JSON.parse(localStorage.getItem('sb-fyvmyyfuxuconhdbiwoa-auth-token'));
console.log('Auth:', auth);

// Oder direkt:
console.log('Current User:', window.location.href);
```

## In Supabase SQL prüfen:
```sql
SELECT id, name, email, role 
FROM public.players 
WHERE email = 'mail@christianspee.de';
```

Sollte zeigen: role = 'captain'
