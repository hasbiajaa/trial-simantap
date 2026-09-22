<?php
namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Models\NotifikasiModel;

class NotifikasiController extends ResourceController
{
    protected $modelName = NotifikasiModel::class;
    protected $format    = 'json';

    public function index()
    {
        return $this->respond($this->model->findAll());
    }

    public function markRead($id = null)
    {
        if ($this->model->update($id, ['is_read' => 1])) {
            return $this->respond(['message' => 'Ditandai sudah dibaca']);
        }
        return $this->failValidationErrors($this->model->errors());
    }
}
