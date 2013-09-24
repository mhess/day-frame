class HomeController < ApplicationController

  def welcome
  end
  
  def index
    if not user_signed_in?
      redirect_to welcome_path and return
    end
  end

end
