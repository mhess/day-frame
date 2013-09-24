class Task < ActiveRecord::Base
  belongs_to :user, validate: true

  validates :title, presence: true  
  validates :start, numericality: {only_integer: true}, allow_blank: true
  validates :priority, numericality: {only_integer: true}, presence: true
end
