<?php
namespace App\Database\Migrations;
use CodeIgniter\Database\Migration;
class CreateDokumenTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'auto_increment' => true],
            'audit_id'   => ['type' => 'INT', 'null' => true],
            'nama_file'  => ['type' => 'VARCHAR', 'constraint' => 255],
            'url'        => ['type' => 'VARCHAR', 'constraint' => 255],
            'uploaded_by'=> ['type' => 'INT', 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('dokumen');
    }
    public function down() { $this->forge->dropTable('dokumen'); }
}
