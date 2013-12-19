class ApplicationController < ActionController::Base
  protect_from_forgery
  
  after_action :csrf_cookie_for_ng

  def csrf_cookie_for_ng
    cookies['XSRF-TOKEN'] = form_authenticity_token if protect_against_forgery?
  end

  def ajax_auth_user!
    render json: nil, status: :unauthorized unless user_signed_in?
  end

  protected

  def verified_request?
    super || form_authenticity_token == request.headers['X-XSRF-TOKEN']
  end
end
