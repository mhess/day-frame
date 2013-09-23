module RegistrationsHelper
  def time_entries
    hours.map {|t| [t.to_s+"AM", t*100]} + [["12PM", 1200]] +
      hours.map {|t| [t.to_s+"PM", (t+12)*100]} + [["12AM", 2400]]
  end
  private
  def hours
    (1..11).to_a
  end
end
