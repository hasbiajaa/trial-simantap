<?php
namespace App\Models;
use CodeIgniter\Model;

class DokumenModel extends Model
{
    protected $table            = 'dokumen';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = ['audit_id', 'nama_file', 'url', 'uploaded_by'];
    protected $useTimestamps = true;
}
