class HomeController < ApplicationController
  
  def index
    cookies["google_api_config"] = {
      value: {
        apiKey: ENV['GOOGLE_API_KEY'],
        clientId: ENV['GOOGLE_CLIENT_ID']
      }.to_json}
    if user_signed_in?
      cookies["user_info"] = {value: current_user.slice(:name, :wake, :sleep).to_json}
    end
  end

end
