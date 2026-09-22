<?php
namespace App\Database\Migrations;
use CodeIgniter\Database\Migration;
class CreateNotifikasiTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'auto_increment' => true],
            'user_id'    => ['type' => 'INT'],
            'judul'      => ['type' => 'VARCHAR', 'constraint' => 255],
            'isi'        => ['type' => 'TEXT'],
            'tipe'       => ['type' => 'VARCHAR', 'constraint' => 50],
            'is_read'    => ['type' => 'TINYINT', 'default' => 0],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('notifikasi');
    }
    public function down() { $this->forge->dropTable('notifikasi'); }
}
