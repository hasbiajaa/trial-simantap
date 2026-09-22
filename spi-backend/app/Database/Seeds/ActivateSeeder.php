<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class ActivateSeeder extends Seeder
{
    public function run()
    {
        $this->db->table('users')->update(['active' => 1]);
    }
}
