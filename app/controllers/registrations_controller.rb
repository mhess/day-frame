class RegistrationsController < Devise::RegistrationsController
  view_paths = ['app/views/registrations']
  before_action :update_sanitized_params
  before_action :ajax_auth_user!, only: [:info, :update]

  respond_to :json

  def info
    render json: current_user
  end

  # POST /resource                
  def create
    build_resource(sign_up_params)

    if resource.save
      yield resource if block_given?
      if resource.active_for_authentication?
        sign_up(resource_name, resource)
        render json: resource.attributes.slice('name', 'sleep', 'wake')
      else
        expire_data_after_sign_in!
        render json: resource.attributes.slice('name', 'sleep', 'wake')
      end
    else
      clean_up_passwords resource
      respond_with resource
    end
  end

  # PUT
  def update
    res = current_user
    if res.update(account_update_params)
      render json: res.slice('name', 'sleep', 'wake', 'gcals')
    else
      respond_with res
    end
  end

  protected

  def update_sanitized_params
    devise_parameter_sanitizer.for(:sign_up) do |p|
      p.permit(:name, :email, :password, :password_confirmation)  
    end
    devise_parameter_sanitizer.for(:account_update) do |p|
      p.permit(:name, :wake, :sleep, :gcals)
    end
  end

end
