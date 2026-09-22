<?php
namespace App\Models;
use CodeIgniter\Model;

class TemuanModel extends Model
{
    protected $table            = 'temuan';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = ['audit_id', 'judul', 'risiko_level', 'rekomendasi', 'status', 'unit'];
    protected $useTimestamps = true;
}
