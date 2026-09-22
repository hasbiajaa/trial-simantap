<?php
namespace App\Models;
use CodeIgniter\Model;

class AuditModel extends Model
{
    protected $table            = 'audit';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = ['nama', 'unit', 'ketua_auditor', 'tanggal_mulai', 'perkiraan_selesai', 'status', 'progres'];
    protected $useTimestamps = true;
}
