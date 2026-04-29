# Waveit Smartlink — Local Setup Guide

## Step 1 — Install PostgreSQL

1. Download the PostgreSQL installer for Windows:  
   👉 https://www.enterprisedb.com/downloads/postgres-postgresql-downloads  
   (Choose the latest version, e.g. 16.x)

2. Run the installer. During setup:
   - Set a password for the `postgres` user — **use `postgres`** (matches the `.env` default) or change `.env` to match your chosen password
   - Keep the default port **5432**
   - Keep the default locale

3. After installation, open **pgAdmin** (installed alongside PostgreSQL) or use the **SQL Shell (psql)** from the Start menu.

---

## Step 2 — Create the Database

### Option A — Using pgAdmin (GUI)
1. Open pgAdmin → connect to your local server
2. Right-click **Databases** → **Create** → **Database**
3. Name it `waveit_smartlink` → Save
4. Right-click `waveit_smartlink` → **Query Tool**
5. Open and run the file: `smartlink-app/database/schema.sql`

### Option B — Using psql (command line)
Open **SQL Shell (psql)** from the Start menu and run:
```sql
CREATE DATABASE waveit_smartlink;
\c waveit_smartlink
\i 'C:/Users/Admin/Documents/Website templates/Waveit smartlink/smartlink-app/database/schema.sql'
```

---

## Step 3 — Configure the .env file

Edit `smartlink-app/backend/.env` and set your PostgreSQL password:
```
DB_PASSWORD=your_postgres_password_here
```

Also set a strong JWT secret:
```
JWT_SECRET=any_long_random_string_here_at_least_32_characters
```

---

## Step 4 — Install Node.js dependencies

Open a terminal in `smartlink-app/backend/` and run:
```
npm install
```

---

## Step 5 — Start the server

```
npm start
```

You should see: `Server running on port 5000`

---

## Step 6 — Open the app

Navigate to: **http://localhost:5000**

The Express server serves both the API and the frontend from the same port.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `ECONNREFUSED` on port 5432 | PostgreSQL service is not running. Open Services (Win+R → `services.msc`) and start `postgresql-x64-16` |
| `password authentication failed` | Wrong `DB_PASSWORD` in `.env` |
| `database "waveit_smartlink" does not exist` | Run Step 2 again |
| `JWT_SECRET is not configured` | Set `JWT_SECRET` in `.env` |
