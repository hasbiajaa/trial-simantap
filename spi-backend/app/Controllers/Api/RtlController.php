<?php
namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Models\RtlModel;

class RtlController extends ResourceController
{
    protected $modelName = RtlModel::class;
    protected $format    = 'json';

    public function index()
    {
        return $this->respond($this->model->findAll());
    }

    public function update($id = null)
    {
        $data = $this->request->getJSON(true);
        if ($this->model->update($id, $data)) {
            return $this->respond(['message' => 'Berhasil diupdate']);
        }
        return $this->failValidationErrors($this->model->errors());
    }

    public function uploadBukti($id = null)
    {
        $file = $this->request->getFile('bukti');
        if (!$file->isValid()) {
            return $this->failValidationErrors('File tidak valid');
        }

        $newName = $file->getRandomName();
        $file->move(WRITEPATH . 'uploads', $newName);

        $this->model->update($id, ['bukti_url' => 'uploads/' . $newName]);
        return $this->respond(['message' => 'File berhasil diupload', 'url' => 'uploads/' . $newName]);
    }
}
