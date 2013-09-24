class CreateTasks < ActiveRecord::Migration
  def change
    create_table :tasks do |t|
      t.references :user, index: true
      t.string :title
      t.string :description
      t.integer :duration
      t.integer :start
      t.integer :priority
      t.date :day

      t.timestamps
    end
  end
end
