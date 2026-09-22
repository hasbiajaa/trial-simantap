# Panduan Implementasi — Sistem Informasi SPI
> Stack: React + Vite + TypeScript · CodeIgniter 4 + Shield · MySQL

---

## Gambaran Arsitektur

```
React (Vite + TS)          CodeIgniter 4 + Shield          MySQL
─────────────────          ──────────────────────          ──────
src/pages/Dashboard  ←──── REST API (JSON)          ←────  Tabel DB
axios + JWT header          Controller → Model               users
useEffect → state           CI4 Shield (auth)                audit
form submit                 RESTful Resource                 rtl
                            CORS middleware                  temuan
                                                             jadwal
                                                             notifikasi
                                                             anggaran
```

---

## Stack Lengkap

| Lapisan | Tool | Keterangan |
|---|---|---|
| Frontend | React 19 + Vite + TypeScript | Sudah ada |
| HTTP Client | Axios | Kirim request + JWT header |
| Backend | CodeIgniter 4 | PHP 8.1+ |
| Auth | CI4 Shield | JWT mode untuk SPA |
| Database | MySQL 8.0 | |
| ORM | CI4 Model (built-in) | Query Builder bawaan CI4 |
| File Upload | CI4 File + Storage lokal / S3 | Bukti RTL |
| Calendar | Google Calendar API | Phase akhir |
| Notifikasi | Web Notification API | Tanpa backend tambahan |
| Hosting BE | VPS / Shared Hosting (Apache/Nginx) | CI4 sudah familiar di hosting PHP |
| Hosting FE | Vercel / subfolder di hosting yang sama | |
| Hosting DB | MySQL di hosting yang sama | |

---

## Phase 1 — Setup CodeIgniter 4

### Prasyarat
```
PHP >= 8.1
Composer
MySQL 8.0
```

### Install CI4
```bash
composer create-project codeigniter4/appstarter spi-backend
cd spi-backend
cp env .env
```

### Konfigurasi `.env`
```env
CI_ENVIRONMENT = development

database.default.hostname = localhost
database.default.database = spi_db
database.default.username = root
database.default.password = yourpassword
database.default.DBDriver = MySQLi
database.default.port     = 3306

app.baseURL = 'http://localhost:8080/'
```

### Install CI4 Shield (auth)
```bash
composer require codeigniter4/shield
php spark shield:setup
```

### Aktifkan JWT di Shield

Di `app/Config/AuthJWT.php`:
```php
public string $defaultJWTKeySecret = 'your-random-secret-key-panjang';
public int    $timeToLive          = 3600; // 1 jam
```

Di `app/Config/Auth.php`:
```php
public array $authenticators = [
    'tokens' => AccessTokens::class,
    'jwt'    => JWT::class,         // aktifkan ini
    'session'=> Session::class,
];
public string $defaultAuthenticator = 'jwt';
```

---

## Phase 2 — Database MySQL

### Buat database
```sql
CREATE DATABASE spi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Migration — jalankan lewat Spark
```bash
php spark migrate
```

### Tabel tambahan (buat via Migration CI4)
```bash
php spark make:migration CreateAuditTable
php spark make:migration CreateTemuanTable
php spark make:migration CreateRtlTable
php spark make:migration CreateJadwalRapatTable
php spark make:migration CreateNotifikasiTable
php spark make:migration CreateAnggaranTable
php spark make:migration CreateDokumenTable
```

### Skema tabel utama

```php
// CreateAuditTable
$this->forge->addField([
    'id'                => ['type' => 'INT', 'auto_increment' => true],
    'nama'              => ['type' => 'VARCHAR', 'constraint' => 255],
    'unit'              => ['type' => 'VARCHAR', 'constraint' => 100],
    'ketua_auditor'     => ['type' => 'VARCHAR', 'constraint' => 100],
    'tanggal_mulai'     => ['type' => 'DATE'],
    'perkiraan_selesai' => ['type' => 'DATE'],
    'status'            => ['type' => 'ENUM', 'constraint' => ['Rencana','Berjalan','Selesai']],
    'progres'           => ['type' => 'TINYINT', 'default' => 0],
    'created_at'        => ['type' => 'DATETIME', 'null' => true],
    'updated_at'        => ['type' => 'DATETIME', 'null' => true],
]);

// CreateTemuanTable
// id, audit_id (FK), judul, risiko_level (Rendah/Sedang/Tinggi/Kritis),
// rekomendasi, status (Open/Closed), unit

// CreateRtlTable
// id, temuan_id (FK), unit, batas_waktu, progres (0-100),
// status (Belum/Dalam Proses/Selesai/Terlambat), bukti_url, catatan

// CreateJadwalRapatTable
// id, judul, tanggal, waktu, lokasi, peserta (JSON), catatan,
// google_event_id (nullable), created_by

// CreateNotifikasiTable
// id, user_id (FK), judul, isi, tipe, is_read (TINYINT), created_at

// CreateAnggaranTable
// id, tahun, komponen, rencana (DECIMAL), realisasi (DECIMAL)
```

```bash
php spark migrate
```

---

## Phase 3 — Controller & Model CI4

### Struktur folder backend
```
app/
├── Controllers/
│   ├── Api/
│   │   ├── AuthController.php
│   │   ├── AuditController.php
│   │   ├── TemuanController.php
│   │   ├── RtlController.php
│   │   ├── KalenderController.php
│   │   ├── NotifikasiController.php
│   │   └── AnggaranController.php
├── Models/
│   ├── AuditModel.php
│   ├── TemuanModel.php
│   ├── RtlModel.php
│   └── NotifikasiModel.php
├── Filters/
│   └── JwtFilter.php          ← guard semua route /api
└── Config/
    └── Routes.php
```

### Routes (`app/Config/Routes.php`)
```php
$routes->group('api', ['namespace' => 'App\Controllers\Api'], function ($routes) {

    // Auth — publik
    $routes->post('auth/login',    'AuthController::login');
    $routes->post('auth/register', 'AuthController::register');

    // Protected — perlu JWT
    $routes->group('', ['filter' => 'jwtAuth'], function ($routes) {
        $routes->get('audit',              'AuditController::index');
        $routes->post('audit',             'AuditController::create');
        $routes->get('audit/(:num)',       'AuditController::show/$1');
        $routes->put('audit/(:num)',       'AuditController::update/$1');

        $routes->get('rtl',               'RtlController::index');   // ?unit=BAAK
        $routes->put('rtl/(:num)',        'RtlController::update/$1');
        $routes->post('rtl/(:num)/bukti', 'RtlController::uploadBukti/$1');

        $routes->get('temuan',            'TemuanController::index');
        $routes->get('kalender',          'KalenderController::index');
        $routes->post('kalender',         'KalenderController::create');

        $routes->get('notifikasi',        'NotifikasiController::index');
        $routes->patch('notifikasi/(:num)/read', 'NotifikasiController::markRead/$1');

        $routes->get('anggaran',          'AnggaranController::index');
    });
});
```

### Contoh Controller
```php
// app/Controllers/Api/RtlController.php
class RtlController extends ResourceController {
    protected $modelName = 'App\Models\RtlModel';
    protected $format    = 'json';

    public function index() {
        $unit = $this->request->getGet('unit');
        $data = $unit
            ? $this->model->where('unit', $unit)->findAll()
            : $this->model->findAll();
        return $this->respond($data);
    }

    public function update($id = null) {
        $json = $this->request->getJSON(true);
        $this->model->update($id, $json);
        return $this->respond(['message' => 'updated']);
    }
}
```

### CORS — wajib untuk React dev
```php
// app/Filters/CorsFilter.php
public function before(RequestInterface $request, $arguments = null) {
    header('Access-Control-Allow-Origin: http://localhost:5173');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    if ($request->getMethod() === 'options') {
        exit(0);
    }
}
```

---

## Phase 4 — Koneksi Frontend ke Backend

### Install Axios
```bash
pnpm add axios
```

### API client dengan JWT header
```ts
// src/lib/api.ts
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // http://localhost:8080/api
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("spi_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("spi_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
```

### Login — ganti hardcoded users
```ts
// src/lib/auth.ts
export async function login(email: string, password: string) {
  const { data } = await api.post("/auth/login", { email, password });
  localStorage.setItem("spi_token", data.token);
  return data.user; // { id, nama, role, unit }
}
```

### Custom hooks per modul
```ts
// src/hooks/useRTL.ts
export function useRTL(unit?: string) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/rtl${unit ? `?unit=${unit}` : ""}`)
       .then(r => setData(r.data))
       .finally(() => setLoading(false));
  }, [unit]);

  return { data, loading };
}

// Pakai di komponen:
// const { data: rtlList, loading } = useRTL(myUnit);
```

### Yang perlu diubah di Dashboard.tsx
- Ganti array data hardcoded → `useEffect` + `api.get(...)`
- Ganti login dummy users → call `/api/auth/login`
- Tambah loading state di tiap section
- Form submit (tambah rapat, update RTL, dll) → `api.post/put`

---

## Phase 5 — Auth dengan CI4 Shield

### Login endpoint di CI4
```php
// app/Controllers/Api/AuthController.php
public function login() {
    $credentials = [
        'email'    => $this->request->getJSON()->email,
        'password' => $this->request->getJSON()->password,
    ];

    $result = auth('jwt')->attempt($credentials);

    if (!$result->isOK()) {
        return $this->failUnauthorized('Email atau password salah');
    }

    $user  = auth('jwt')->user();
    $token = auth('jwt')->getJWT();

    return $this->respond([
        'token' => $token,
        'user'  => [
            'id'   => $user->id,
            'nama' => $user->username,
            'email'=> $user->email,
            'role' => $user->getGroups()[0] ?? 'auditee', // CI4 Shield groups = roles
            'unit' => $user->unit ?? null,
        ],
    ]);
}
```

### Setup role via Shield Groups
```bash
php spark shield:publish  # publish config
```

```php
// CI4 Shield groups mapping ke role frontend:
// group: superadmin  → role: full
// group: pengawasan  → role: pengawasan
// group: backoffice  → role: backoffice
// group: auditee     → role: auditee
```

---

## Phase 6 — File Upload (Bukti RTL)

```php
// app/Controllers/Api/RtlController.php
public function uploadBukti($id) {
    $file = $this->request->getFile('bukti');

    if (!$file->isValid()) {
        return $this->fail('File tidak valid');
    }

    $newName = $file->getRandomName();
    $file->move(WRITEPATH . 'uploads/rtl', $newName);

    $url = base_url("uploads/rtl/{$newName}");
    $this->model->update($id, ['bukti_url' => $url]);

    return $this->respond(['bukti_url' => $url]);
}
```

```ts
// Frontend upload
async function uploadBukti(rtlId: number, file: File) {
  const form = new FormData();
  form.append("bukti", file);
  const { data } = await api.post(`/rtl/${rtlId}/bukti`, form);
  return data.bukti_url;
}
```

---

## Phase 7 — Browser Notification Reminder

> Tidak butuh backend tambahan. Jalan di frontend saja.

```ts
// src/lib/reminder.ts

export async function requestPermission() {
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

export function scheduleReminder(judul: string, tanggal: Date, menitSebelum = 30) {
  const delay = tanggal.getTime() - Date.now() - menitSebelum * 60_000;
  if (delay <= 0) return;
  setTimeout(() => {
    new Notification(`🔔 Pengingat: ${judul}`, {
      body: `Dimulai ${menitSebelum} menit lagi`,
      icon: "/logo.png",
    });
  }, delay);
}
```

```ts
// Panggil setelah fetch jadwal
jadwalList.forEach(j => scheduleReminder(j.judul, new Date(j.tanggal)));
```

---

## Phase 8 — Google Calendar (Opsional)

### Prasyarat
- Akun Google Cloud → aktifkan Google Calendar API
- Buat OAuth 2.0 Client ID → Web Application
- Tambahkan redirect URI: `http://localhost:5173` dan domain produksi

### Install
```bash
pnpm add @react-oauth/google
```

### Simpan Google Event ID di tabel `jadwal_rapat`
Kolom `google_event_id VARCHAR(255) NULL` — isi saat user pilih sync ke GCal.

```ts
// Fetch events dari Google Calendar
async function fetchGCalEvents(accessToken: string) {
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events" +
    "?timeMin=" + new Date().toISOString() +
    "&maxResults=20&orderBy=startTime&singleEvents=true",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return res.json();
}
```

---

## Phase 9 — Deployment

### Backend CI4 (Shared Hosting / VPS)
```
1. Upload folder spi-backend ke public_html/api (atau subdomain api.yourdomain.com)
2. Pastikan folder writable/ punya permission 775
3. Set .env CI_ENVIRONMENT = production
4. Arahkan DocumentRoot ke folder public/
5. Aktifkan mod_rewrite (Apache) atau config Nginx
```

```nginx
# Nginx config untuk CI4
location / {
    try_files $uri $uri/ /index.php?$query_string;
}
```

### Frontend React (Vercel)
```bash
pnpm build
vercel deploy --prod
```

```env
# .env.production
VITE_API_URL=https://api.yourdomain.com/api
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

### Checklist sebelum go-live
- [ ] Ganti JWT secret key dengan string acak panjang
- [ ] Set CORS hanya untuk domain produksi
- [ ] Aktifkan HTTPS
- [ ] Backup database otomatis
- [ ] Test semua role (full, pengawasan, backoffice, auditee)

---

## Urutan Pengerjaan

| Minggu | Target |
|---|---|
| 1 | Setup CI4 + Shield + MySQL, migration tabel |
| 2 | Auth (login/logout JWT), CORS, koneksi axios |
| 3 | Endpoint + Model: Audit, Temuan, RTL |
| 4 | Endpoint + Model: Kalender, Notifikasi, Anggaran |
| 5 | Ganti data hardcoded di frontend → API call |
| 6 | File upload bukti RTL |
| 7 | Browser notification reminder |
| 8 | Google Calendar (opsional) |
| 9 | Testing per role, bug fix |
| 10 | Deployment production |

## Estimasi Waktu

| Phase | Estimasi |
|---|---|
| CI4 setup + DB migration | 2–3 hari |
| Auth Shield + JWT | 2–3 hari |
| Semua endpoint + model | 5–7 hari |
| Koneksi frontend–backend | 5–7 hari |
| File upload | 1–2 hari |
| Browser notification | 1 hari |
| Google Calendar | 2–3 hari |
| Testing + deployment | 3–4 hari |
| **Total** | **~4–5 minggu** |

---

*Stack CI4 + Shield + MySQL sangat cocok untuk hosting PHP konvensional (cPanel, Niagahoster, dll) — tidak perlu VPS khusus Node.js.*
