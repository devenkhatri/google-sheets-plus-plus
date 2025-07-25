require 'net/http'
require 'uri'
require 'json'

# Airtable Clone SDK for Ruby
# A client library for interacting with the Airtable Clone API
class AirtableCloneSDK
  # Initialize the SDK with authentication credentials
  # @param api_key [String] API key for authentication
  # @param token [String] JWT token for authentication
  # @param base_url [String] Base URL for the API
  def initialize(options = {})
    @api_key = options[:api_key]
    @token = options[:token]
    @base_url = options[:base_url] || 'http://localhost:3000/api/v1'
  end

  # Make an API request
  # @param method [Symbol] HTTP method
  # @param path [String] API path
  # @param data [Hash] Request data
  # @param params [Hash] Query parameters
  # @return [Hash] API response
  def request(method, path, data: nil, params: nil)
    url = URI.parse("#{@base_url}#{path}")
    
    # Add query parameters if provided
    if params
      url.query = URI.encode_www_form(params)
    end
    
    # Create request
    http = Net::HTTP.new(url.host, url.port)
    http.use_ssl = url.scheme == 'https'
    
    # Create request based on method
    case method
    when :get
      request = Net::HTTP::Get.new(url)
    when :post
      request = Net::HTTP::Post.new(url)
    when :patch
      request = Net::HTTP::Patch.new(url)
    when :put
      request = Net::HTTP::Put.new(url)
    when :delete
      request = Net::HTTP::Delete.new(url)
    else
      raise ArgumentError, "Unsupported HTTP method: #{method}"
    end
    
    # Add authentication
    if @api_key
      request['X-API-Key'] = @api_key
    elsif @token
      request['Authorization'] = "Bearer #{@token}"
    end
    
    # Add content type for JSON requests
    request['Content-Type'] = 'application/json'
    
    # Add request body if provided
    if data && [:post, :patch, :put].include?(method)
      request.body = data.to_json
    end
    
    # Send request
    response = http.request(request)
    
    # Parse response
    begin
      response_data = JSON.parse(response.body)
    rescue JSON::ParserError
      response_data = { 'status' => 'error', 'message' => 'Invalid JSON response' }
    end
    
    # Handle errors
    unless response.is_a?(Net::HTTPSuccess)
      error_message = response_data['message'] || 'API request failed'
      raise APIError.new(error_message, response.code.to_i, response_data)
    end
    
    response_data
  end

  # Authentication methods
  def auth
    @auth ||= Auth.new(self)
  end

  # Base methods
  def bases
    @bases ||= Bases.new(self)
  end

  # Table methods
  def tables
    @tables ||= Tables.new(self)
  end

  # Record methods
  def records
    @records ||= Records.new(self)
  end

  # Field methods
  def fields
    @fields ||= Fields.new(self)
  end

  # View methods
  def views
    @views ||= Views.new(self)
  end

  # Webhook methods
  def webhooks
    @webhooks ||= Webhooks.new(self)
  end

  # Search methods
  def search
    @search ||= Search.new(self)
  end

  # Import/Export methods
  def import_export
    @import_export ||= ImportExport.new(self)
  end

  # Authentication methods
  class Auth
    def initialize(client)
      @client = client
    end

    # Login with email and password
    # @param email [String] User email
    # @param password [String] User password
    # @return [Hash] Authentication response with token
    def login(email, password)
      response = @client.request(:post, '/auth/login', data: { email: email, password: password })
      @client.instance_variable_set(:@token, response['data']['token'])
      response
    end

    # Register a new user
    # @param user_data [Hash] User registration data
    # @return [Hash] Registration response
    def register(user_data)
      @client.request(:post, '/auth/register', data: user_data)
    end

    # Get current user profile
    # @return [Hash] User profile
    def get_profile
      @client.request(:get, '/auth/profile')
    end

    # Create a new API key
    # @param api_key_data [Hash] API key data
    # @return [Hash] Created API key
    def create_api_key(api_key_data)
      @client.request(:post, '/auth/api-keys', data: api_key_data)
    end

    # List API keys
    # @return [Hash] List of API keys
    def list_api_keys
      @client.request(:get, '/auth/api-keys')
    end

    # Delete an API key
    # @param api_key_id [String] API key ID
    # @return [Hash] Deletion response
    def delete_api_key(api_key_id)
      @client.request(:delete, "/auth/api-keys/#{api_key_id}")
    end
  end

  # Base methods
  class Bases
    def initialize(client)
      @client = client
    end

    # Create a new base
    # @param base_data [Hash] Base data
    # @return [Hash] Created base
    def create(base_data)
      @client.request(:post, '/bases', data: base_data)
    end

    # Get all bases
    # @return [Hash] List of bases
    def list
      @client.request(:get, '/bases')
    end

    # Get a base by ID
    # @param base_id [String] Base ID
    # @return [Hash] Base details
    def get(base_id)
      @client.request(:get, "/bases/#{base_id}")
    end

    # Update a base
    # @param base_id [String] Base ID
    # @param base_data [Hash] Base data to update
    # @return [Hash] Updated base
    def update(base_id, base_data)
      @client.request(:patch, "/bases/#{base_id}", data: base_data)
    end

    # Delete a base
    # @param base_id [String] Base ID
    # @return [Hash] Deletion response
    def delete(base_id)
      @client.request(:delete, "/bases/#{base_id}")
    end

    # Share a base with users
    # @param base_id [String] Base ID
    # @param share_data [Hash] Share configuration
    # @return [Hash] Share response
    def share(base_id, share_data)
      @client.request(:post, "/bases/#{base_id}/share", data: share_data)
    end
  end

  # Table methods
  class Tables
    def initialize(client)
      @client = client
    end

    # Create a new table
    # @param table_data [Hash] Table data
    # @return [Hash] Created table
    def create(table_data)
      @client.request(:post, '/tables', data: table_data)
    end

    # Get tables in a base
    # @param base_id [String] Base ID
    # @return [Hash] List of tables
    def list(base_id)
      @client.request(:get, "/bases/#{base_id}/tables")
    end

    # Get a table by ID
    # @param table_id [String] Table ID
    # @return [Hash] Table details
    def get(table_id)
      @client.request(:get, "/tables/#{table_id}")
    end

    # Update a table
    # @param table_id [String] Table ID
    # @param table_data [Hash] Table data to update
    # @return [Hash] Updated table
    def update(table_id, table_data)
      @client.request(:patch, "/tables/#{table_id}", data: table_data)
    end

    # Delete a table
    # @param table_id [String] Table ID
    # @return [Hash] Deletion response
    def delete(table_id)
      @client.request(:delete, "/tables/#{table_id}")
    end
  end

  # Record methods
  class Records
    def initialize(client)
      @client = client
    end

    # Create a new record
    # @param table_id [String] Table ID
    # @param record_data [Hash] Record data
    # @return [Hash] Created record
    def create(table_id, record_data)
      @client.request(:post, "/tables/#{table_id}/records", data: record_data)
    end

    # Get records from a table
    # @param table_id [String] Table ID
    # @param query_params [Hash] Query parameters
    # @return [Hash] List of records
    def list(table_id, query_params = {})
      @client.request(:get, "/tables/#{table_id}/records", params: query_params)
    end

    # Get a record by ID
    # @param table_id [String] Table ID
    # @param record_id [String] Record ID
    # @return [Hash] Record details
    def get(table_id, record_id)
      @client.request(:get, "/tables/#{table_id}/records/#{record_id}")
    end

    # Update a record
    # @param table_id [String] Table ID
    # @param record_id [String] Record ID
    # @param record_data [Hash] Record data to update
    # @return [Hash] Updated record
    def update(table_id, record_id, record_data)
      @client.request(:patch, "/tables/#{table_id}/records/#{record_id}", data: record_data)
    end

    # Delete a record
    # @param table_id [String] Table ID
    # @param record_id [String] Record ID
    # @return [Hash] Deletion response
    def delete(table_id, record_id)
      @client.request(:delete, "/tables/#{table_id}/records/#{record_id}")
    end

    # Bulk create records
    # @param table_id [String] Table ID
    # @param records [Array] Array of record data
    # @return [Hash] Bulk creation response
    def bulk_create(table_id, records)
      @client.request(:post, "/tables/#{table_id}/records/bulk", data: { records: records })
    end

    # Bulk update records
    # @param table_id [String] Table ID
    # @param records [Array] Array of record updates
    # @return [Hash] Bulk update response
    def bulk_update(table_id, records)
      @client.request(:patch, "/tables/#{table_id}/records/bulk", data: { records: records })
    end

    # Bulk delete records
    # @param table_id [String] Table ID
    # @param record_ids [Array] Array of record IDs
    # @return [Hash] Bulk deletion response
    def bulk_delete(table_id, record_ids)
      @client.request(:delete, "/tables/#{table_id}/records/bulk", data: { recordIds: record_ids })
    end
  end

  # Field methods
  class Fields
    def initialize(client)
      @client = client
    end

    # Create a new field
    # @param table_id [String] Table ID
    # @param field_data [Hash] Field data
    # @return [Hash] Created field
    def create(table_id, field_data)
      @client.request(:post, "/tables/#{table_id}/fields", data: field_data)
    end

    # Get fields in a table
    # @param table_id [String] Table ID
    # @return [Hash] List of fields
    def list(table_id)
      @client.request(:get, "/tables/#{table_id}/fields")
    end

    # Get a field by ID
    # @param table_id [String] Table ID
    # @param field_id [String] Field ID
    # @return [Hash] Field details
    def get(table_id, field_id)
      @client.request(:get, "/tables/#{table_id}/fields/#{field_id}")
    end

    # Update a field
    # @param table_id [String] Table ID
    # @param field_id [String] Field ID
    # @param field_data [Hash] Field data to update
    # @return [Hash] Updated field
    def update(table_id, field_id, field_data)
      @client.request(:patch, "/tables/#{table_id}/fields/#{field_id}", data: field_data)
    end

    # Delete a field
    # @param table_id [String] Table ID
    # @param field_id [String] Field ID
    # @return [Hash] Deletion response
    def delete(table_id, field_id)
      @client.request(:delete, "/tables/#{table_id}/fields/#{field_id}")
    end
  end

  # View methods
  class Views
    def initialize(client)
      @client = client
    end

    # Create a new view
    # @param table_id [String] Table ID
    # @param view_data [Hash] View data
    # @return [Hash] Created view
    def create(table_id, view_data)
      @client.request(:post, "/tables/#{table_id}/views", data: view_data)
    end

    # Get views in a table
    # @param table_id [String] Table ID
    # @return [Hash] List of views
    def list(table_id)
      @client.request(:get, "/tables/#{table_id}/views")
    end

    # Get a view by ID
    # @param table_id [String] Table ID
    # @param view_id [String] View ID
    # @return [Hash] View details
    def get(table_id, view_id)
      @client.request(:get, "/tables/#{table_id}/views/#{view_id}")
    end

    # Update a view
    # @param table_id [String] Table ID
    # @param view_id [String] View ID
    # @param view_data [Hash] View data to update
    # @return [Hash] Updated view
    def update(table_id, view_id, view_data)
      @client.request(:patch, "/tables/#{table_id}/views/#{view_id}", data: view_data)
    end

    # Delete a view
    # @param table_id [String] Table ID
    # @param view_id [String] View ID
    # @return [Hash] Deletion response
    def delete(table_id, view_id)
      @client.request(:delete, "/tables/#{table_id}/views/#{view_id}")
    end
  end

  # Webhook methods
  class Webhooks
    def initialize(client)
      @client = client
    end

    # Create a new webhook
    # @param webhook_data [Hash] Webhook data
    # @return [Hash] Created webhook
    def create(webhook_data)
      @client.request(:post, '/webhooks', data: webhook_data)
    end

    # Get webhooks for a base
    # @param base_id [String] Base ID
    # @return [Hash] List of webhooks
    def list(base_id)
      @client.request(:get, "/webhooks/base/#{base_id}")
    end

    # Get a webhook by ID
    # @param webhook_id [String] Webhook ID
    # @return [Hash] Webhook details
    def get(webhook_id)
      @client.request(:get, "/webhooks/#{webhook_id}")
    end

    # Update a webhook
    # @param webhook_id [String] Webhook ID
    # @param webhook_data [Hash] Webhook data to update
    # @return [Hash] Updated webhook
    def update(webhook_id, webhook_data)
      @client.request(:patch, "/webhooks/#{webhook_id}", data: webhook_data)
    end

    # Delete a webhook
    # @param webhook_id [String] Webhook ID
    # @return [Hash] Deletion response
    def delete(webhook_id)
      @client.request(:delete, "/webhooks/#{webhook_id}")
    end

    # Toggle webhook active status
    # @param webhook_id [String] Webhook ID
    # @param active [Boolean] Active status
    # @return [Hash] Updated webhook
    def toggle_active(webhook_id, active)
      @client.request(:patch, "/webhooks/#{webhook_id}/active", data: { active: active })
    end

    # Get webhook deliveries
    # @param webhook_id [String] Webhook ID
    # @param limit [Integer] Maximum number of deliveries to return
    # @return [Hash] List of webhook deliveries
    def get_deliveries(webhook_id, limit = 50)
      @client.request(:get, "/webhooks/#{webhook_id}/deliveries", params: { limit: limit })
    end
  end

  # Search methods
  class Search
    def initialize(client)
      @client = client
    end

    # Global search across all bases
    # @param query [String] Search query
    # @param options [Hash] Search options
    # @return [Hash] Search results
    def global(query, options = {})
      @client.request(:get, '/search', params: { query: query }.merge(options))
    end

    # Search within a base
    # @param base_id [String] Base ID
    # @param query [String] Search query
    # @param options [Hash] Search options
    # @return [Hash] Search results
    def base(base_id, query, options = {})
      @client.request(:get, "/search/base/#{base_id}", params: { query: query }.merge(options))
    end

    # Search within a table
    # @param table_id [String] Table ID
    # @param query [String] Search query
    # @param options [Hash] Search options
    # @return [Hash] Search results
    def table(table_id, query, options = {})
      @client.request(:get, "/search/table/#{table_id}", params: { query: query }.merge(options))
    end
  end

  # Import/Export methods
  class ImportExport
    def initialize(client)
      @client = client
    end

    # Export data to CSV
    # @param table_id [String] Table ID
    # @param options [Hash] Export options
    # @return [String] CSV data
    def export_csv(table_id, options = {})
      url = URI.parse("#{@client.instance_variable_get(:@base_url)}/export/csv/#{table_id}")
      
      # Add query parameters if provided
      if options && !options.empty?
        url.query = URI.encode_www_form(options)
      end
      
      # Create request
      http = Net::HTTP.new(url.host, url.port)
      http.use_ssl = url.scheme == 'https'
      
      request = Net::HTTP::Get.new(url)
      
      # Add authentication
      api_key = @client.instance_variable_get(:@api_key)
      token = @client.instance_variable_get(:@token)
      
      if api_key
        request['X-API-Key'] = api_key
      elsif token
        request['Authorization'] = "Bearer #{token}"
      end
      
      # Send request
      response = http.request(request)
      
      # Handle errors
      unless response.is_a?(Net::HTTPSuccess)
        begin
          response_data = JSON.parse(response.body)
          error_message = response_data['message'] || 'API request failed'
        rescue JSON::ParserError
          error_message = 'API request failed'
        end
        
        raise APIError.new(error_message, response.code.to_i, response_data)
      end
      
      response.body
    end
  end

  # API Error class
  class APIError < StandardError
    attr_reader :status_code, :response_data

    def initialize(message, status_code, response_data = nil)
      @status_code = status_code
      @response_data = response_data
      super(message)
    end
  end
end