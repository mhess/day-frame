class AddWakeSleepToUser < ActiveRecord::Migration
  class User < ActiveRecord::Base
  end

  def change
    add_column :users, :wake, :integer, default: 700
    add_column :users, :sleep, :integer, default: 1100
    # User.reset_column_information()
    # reversible do |dir|
    #   # Allows User.default_values to run
    #   dir.up { User.update_all {} }
    # end
  end
end
