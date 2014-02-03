class AddGcalsToUsers < ActiveRecord::Migration
  def change
    add_column :users, :gcals, :string
  end
end
