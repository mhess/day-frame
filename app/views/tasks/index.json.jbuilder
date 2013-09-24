json.array!(@tasks) do |task|
  json.extract! task, :title, :description, :duration, :start, :priority, :day
  json.url task_url(task, format: :json)
end
