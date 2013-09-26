json.array!(@tasks) do |task|
  json.extract! task, :id, :title, :description, :duration, :start, :priority, :day
end
