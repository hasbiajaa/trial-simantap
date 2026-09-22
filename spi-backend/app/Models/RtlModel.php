<?php
namespace App\Models;
use CodeIgniter\Model;

class RtlModel extends Model
{
    protected $table            = 'rtl';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = ['temuan_id', 'unit', 'batas_waktu', 'progres', 'status', 'bukti_url', 'catatan'];
    protected $useTimestamps = true;
}
