<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use CodeIgniter\Shield\Entities\User;

class UserSeeder extends Seeder
{
    public function run()
    {
        $users = model('UserModel');

        $accounts = [
            [
                'email' => 'ketua@spi.tsu.ac.id',
                'password' => 'ketua123',
                'username' => 'ketua',
                'group' => 'superadmin'
            ],
            [
                'email' => 'auditor@spi.tsu.ac.id',
                'password' => 'audit123',
                'username' => 'auditor',
                'group' => 'pengawasan'
            ],
            [
                'email' => 'backoffice@spi.tsu.ac.id',
                'password' => 'office123',
                'username' => 'backoffice',
                'group' => 'backoffice'
            ],
            [
                'email' => 'baak@auditee.tsu.ac.id',
                'password' => 'baak123',
                'username' => 'baak',
                'group' => 'auditee'
            ],
            [
                'email' => 'rektor@tsu.ac.id',
                'password' => 'rektor123',
                'username' => 'rektor',
                'group' => 'superadmin'
            ],
        ];

        foreach ($accounts as $acc) {
            $user = new User([
                'username' => $acc['username'],
                'email'    => $acc['email'],
                'password' => $acc['password'],
                'active'   => 1,
            ]);
            $users->save($user);

            // To get the complete user object with ID, we need to get from the database
            $user = $users->findById($users->getInsertID());

            // Add to default group
            $user->addGroup($acc['group']);
        }
    }
}
