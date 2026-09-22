<?php
namespace App\Models;
use CodeIgniter\Model;

class JadwalRapatModel extends Model
{
    protected $table            = 'jadwal_rapat';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = ['judul', 'tanggal', 'waktu', 'lokasi', 'peserta', 'catatan', 'google_event_id', 'created_by'];
    protected $useTimestamps = true;
}
