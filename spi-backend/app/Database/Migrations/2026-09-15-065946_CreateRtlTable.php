<?php
namespace App\Database\Migrations;
use CodeIgniter\Database\Migration;
class CreateRtlTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'auto_increment' => true],
            'temuan_id'   => ['type' => 'INT'],
            'unit'        => ['type' => 'VARCHAR', 'constraint' => 100],
            'batas_waktu' => ['type' => 'DATE'],
            'progres'     => ['type' => 'TINYINT', 'default' => 0],
            'status'      => ['type' => 'ENUM', 'constraint' => ['Belum','Dalam Proses','Selesai','Terlambat']],
            'bukti_url'   => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'catatan'     => ['type' => 'TEXT', 'null' => true],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('rtl');
    }
    public function down() { $this->forge->dropTable('rtl'); }
}
