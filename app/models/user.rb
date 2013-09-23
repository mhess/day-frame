class User < ActiveRecord::Base
  before_save {@email = email.downcase}
  validates :wake, numericality: { only_integer: true }
  validates :sleep, numericality: { only_integer: true }
  validates :name, presence: true

  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :trackable, :validatable
end
