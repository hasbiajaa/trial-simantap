<?php
namespace App\Database\Migrations;
use CodeIgniter\Database\Migration;
class CreateAuditTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'                => ['type' => 'INT', 'auto_increment' => true],
            'nama'              => ['type' => 'VARCHAR', 'constraint' => 255],
            'unit'              => ['type' => 'VARCHAR', 'constraint' => 100],
            'ketua_auditor'     => ['type' => 'VARCHAR', 'constraint' => 100],
            'tanggal_mulai'     => ['type' => 'DATE'],
            'perkiraan_selesai' => ['type' => 'DATE'],
            'status'            => ['type' => 'ENUM', 'constraint' => ['Rencana','Berjalan','Selesai']],
            'progres'           => ['type' => 'TINYINT', 'default' => 0],
            'created_at'        => ['type' => 'DATETIME', 'null' => true],
            'updated_at'        => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('audit');
    }
    public function down() { $this->forge->dropTable('audit'); }
}
