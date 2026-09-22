<?php
namespace App\Database\Migrations;
use CodeIgniter\Database\Migration;
class CreateJadwalRapatTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'              => ['type' => 'INT', 'auto_increment' => true],
            'judul'           => ['type' => 'VARCHAR', 'constraint' => 255],
            'tanggal'         => ['type' => 'DATE'],
            'waktu'           => ['type' => 'TIME'],
            'lokasi'          => ['type' => 'VARCHAR', 'constraint' => 255],
            'peserta'         => ['type' => 'JSON'],
            'catatan'         => ['type' => 'TEXT', 'null' => true],
            'google_event_id' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'created_by'      => ['type' => 'INT', 'null' => true],
            'created_at'      => ['type' => 'DATETIME', 'null' => true],
            'updated_at'      => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('jadwal_rapat');
    }
    public function down() { $this->forge->dropTable('jadwal_rapat'); }
}
