<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class DemoSeeder extends Seeder
{
    public function run()
    {
        $data = [
            'temuan_id'   => 1,
            'unit'        => 'BAAK',
            'batas_waktu' => '2026-10-01',
            'progres'     => 0,
            'status'      => 'Proses',
            'created_at'  => date('Y-m-d H:i:s'),
            'updated_at'  => date('Y-m-d H:i:s'),
        ];
        $this->db->table('rtl')->insert($data);
    }
}
