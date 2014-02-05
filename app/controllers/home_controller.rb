class HomeController < ApplicationController
  
  def index
    @google_config = {
      apiKey: ENV['GOOGLE_API_KEY'],
      clientId: ENV['GOOGLE_CLIENT_ID']}.to_json
    info = current_user ? current_user.slice(:name, :wake, :sleep, :gcals) : nil
    @user_info = info.to_json
  end

end
