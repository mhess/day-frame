class SessionsController < Devise::SessionsController

  # POST /resource/sign_in
  def create
    respond_to do |format|
      format.html { return super }
      format.json do
        resource = warden.authenticate!(scope: resource_name, recall: "#{controller_path}#failure")
        sign_in_and_redirect(resource_name, resource)
      end
    end
  end

  # DELETE /resource/sign_out
  def destroy
    Devise.sign_out_all_scopes and sign_out or sign_out(resource_name)
    render json: {success: true}
  end
  
  def sign_in_and_redirect(resource_or_scope, resource=nil)
    scope = Devise::Mapping.find_scope!(resource_or_scope)
    resource ||= resource_or_scope
    sign_in(scope, resource) unless warden.user(scope) == resource
    render json: resource.attributes.slice("name", "sleep", "wake")
  end
 
  def failure
    render status: 422, json: {errors: ['bad email/password']}
  end
end
