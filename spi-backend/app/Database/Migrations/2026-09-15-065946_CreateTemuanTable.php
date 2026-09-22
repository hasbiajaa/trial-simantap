<?php
namespace App\Database\Migrations;
use CodeIgniter\Database\Migration;
class CreateTemuanTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'           => ['type' => 'INT', 'auto_increment' => true],
            'audit_id'     => ['type' => 'INT'],
            'judul'        => ['type' => 'VARCHAR', 'constraint' => 255],
            'risiko_level' => ['type' => 'ENUM', 'constraint' => ['Rendah','Sedang','Tinggi','Kritis']],
            'rekomendasi'  => ['type' => 'TEXT'],
            'status'       => ['type' => 'ENUM', 'constraint' => ['Open','Closed']],
            'unit'         => ['type' => 'VARCHAR', 'constraint' => 100],
            'created_at'   => ['type' => 'DATETIME', 'null' => true],
            'updated_at'   => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('temuan');
    }
    public function down() { $this->forge->dropTable('temuan'); }
}
