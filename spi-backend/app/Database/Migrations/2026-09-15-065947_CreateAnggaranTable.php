<?php
namespace App\Database\Migrations;
use CodeIgniter\Database\Migration;
class CreateAnggaranTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'auto_increment' => true],
            'tahun'      => ['type' => 'YEAR'],
            'komponen'   => ['type' => 'VARCHAR', 'constraint' => 255],
            'rencana'    => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0.00],
            'realisasi'  => ['type' => 'DECIMAL', 'constraint' => '15,2', 'default' => 0.00],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('anggaran');
    }
    public function down() { $this->forge->dropTable('anggaran'); }
}
