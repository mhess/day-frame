class HomeController < ApplicationController
  
  def index
    if user_signed_in?
      cookies["user_info"] = {value: current_user.slice(:name, :wake, :sleep).to_json}
    end
  end

end
