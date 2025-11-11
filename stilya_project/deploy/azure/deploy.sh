#!/bin/bash

# Stilya Fashion AI Assistant - Azure Deployment Script
# This script deploys the complete Stilya system to Azure

set -e

# Configuration
RESOURCE_GROUP_NAME="rg-stilya-fashion-ai"
LOCATION="eastus"
DEPLOYMENT_NAME="stilya-deployment-$(date +%s)"
TEMPLATE_FILE="infrastructure.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Azure CLI is installed
check_azure_cli() {
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI is not installed. Please install it first."
        exit 1
    fi
    print_status "Azure CLI is installed"
}

# Function to check if user is logged in
check_azure_login() {
    if ! az account show &> /dev/null; then
        print_error "Not logged in to Azure. Please run 'az login'"
        exit 1
    fi
    print_status "Logged in to Azure"
}

# Function to create resource group
create_resource_group() {
    print_status "Creating resource group: $RESOURCE_GROUP_NAME"
    az group create \
        --name "$RESOURCE_GROUP_NAME" \
        --location "$LOCATION" \
        --output table
}

# Function to deploy infrastructure
deploy_infrastructure() {
    print_status "Deploying Azure infrastructure..."
    
    local deployment_output
    deployment_output=$(az deployment group create \
        --resource-group "$RESOURCE_GROUP_NAME" \
        --template-file "$TEMPLATE_FILE" \
        --name "$DEPLOYMENT_NAME" \
        --parameters \
            appName="stilya-fashion-ai" \
            environment="prod" \
            minReplicas=2 \
            maxReplicas=10 \
        --output json)
    
    if [ $? -eq 0 ]; then
        print_status "Infrastructure deployment successful"
        
        # Extract important outputs
        local app_url=$(echo "$deployment_output" | jq -r '.properties.outputs.applicationUrl.value')
        local key_vault=$(echo "$deployment_output" | jq -r '.properties.outputs.keyVaultName.value')
        local app_insights=$(echo "$deployment_output" | jq -r '.properties.outputs.applicationInsightsName.value')
        local managed_identity=$(echo "$deployment_output" | jq -r '.properties.outputs.managedIdentityPrincipalId.value')
        
        print_status "Application URL: $app_url"
        print_status "Key Vault: $key_vault"
        print_status "Application Insights: $app_insights"
        print_status "Managed Identity: $managed_identity"
        
        # Save outputs to file
        cat > deployment_outputs.json << EOF
{
    "applicationUrl": "$app_url",
    "keyVaultName": "$key_vault",
    "applicationInsightsName": "$app_insights",
    "managedIdentityPrincipalId": "$managed_identity",
    "resourceGroupName": "$RESOURCE_GROUP_NAME",
    "deploymentName": "$DEPLOYMENT_NAME"
}
EOF
        print_status "Deployment outputs saved to deployment_outputs.json"
        
    else
        print_error "Infrastructure deployment failed"
        exit 1
    fi
}

# Function to configure Key Vault access
configure_key_vault_access() {
    if [ ! -f "deployment_outputs.json" ]; then
        print_error "deployment_outputs.json not found. Run infrastructure deployment first."
        exit 1
    fi
    
    local key_vault=$(jq -r '.keyVaultName' deployment_outputs.json)
    local managed_identity=$(jq -r '.managedIdentityPrincipalId' deployment_outputs.json)
    
    print_status "Configuring Key Vault access for managed identity"
    
    # Grant Key Vault Secrets User role to the managed identity
    az role assignment create \
        --role "Key Vault Secrets User" \
        --assignee "$managed_identity" \
        --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP_NAME/providers/Microsoft.KeyVault/vaults/$key_vault"
    
    print_status "Key Vault access configured"
}

# Function to upload secrets to Key Vault
upload_secrets() {
    if [ ! -f "deployment_outputs.json" ]; then
        print_error "deployment_outputs.json not found. Run infrastructure deployment first."
        exit 1
    fi
    
    local key_vault=$(jq -r '.keyVaultName' deployment_outputs.json)
    
    print_status "Uploading secrets to Key Vault: $key_vault"
    
    # Prompt for secrets
    echo -n "Enter Azure Client Secret: "
    read -s azure_client_secret
    echo
    
    echo -n "Enter OpenAI API Key: "
    read -s openai_api_key
    echo
    
    echo -n "Enter PostgreSQL Password: "
    read -s postgres_password
    echo
    
    echo -n "Enter Redis Access Key: "
    read -s redis_key
    echo
    
    # Upload secrets
    az keyvault secret set \
        --vault-name "$key_vault" \
        --name "azure-client-secret" \
        --value "$azure_client_secret" \
        --output none
    
    az keyvault secret set \
        --vault-name "$key_vault" \
        --name "openai-api-key" \
        --value "$openai_api_key" \
        --output none
    
    az keyvault secret set \
        --vault-name "$key_vault" \
        --name "postgres-password" \
        --value "$postgres_password" \
        --output none
    
    az keyvault secret set \
        --vault-name "$key_vault" \
        --name "redis-key" \
        --value "$redis_key" \
        --output none
    
    print_status "Secrets uploaded to Key Vault"
}

# Function to build and push Docker image
build_and_push_image() {
    print_status "Building and pushing Docker image..."
    
    local image_name="stilyafashionai/api"
    local image_tag="latest"
    local full_image_name="$image_name:$image_tag"
    
    # Build image
    print_status "Building Docker image: $full_image_name"
    docker build -t "$full_image_name" -f ../Dockerfile ..
    
    # Check if we should push to Azure Container Registry
    if [ -f "deployment_outputs.json" ]; then
        local resource_group=$(jq -r '.resourceGroupName' deployment_outputs.json)
        
        # Create ACR if it doesn't exist
        local acr_name="stilyaacrprod$(date +%s | tail -c 6)"
        print_status "Creating Azure Container Registry: $acr_name"
        
        az acr create \
            --resource-group "$resource_group" \
            --name "$acr_name" \
            --sku Basic \
            --admin-enabled true \
            --output table
        
        # Login to ACR
        az acr login --name "$acr_name"
        
        # Tag and push image
        local acr_login_server=$(az acr show --name "$acr_name" --query loginServer --output tsv)
        local acr_image_name="$acr_login_server/$image_name:$image_tag"
        
        docker tag "$full_image_name" "$acr_image_name"
        docker push "$acr_image_name"
        
        print_status "Image pushed to ACR: $acr_image_name"
        
        # Update deployment outputs with ACR info
        jq ". + {\"acrName\": \"$acr_name\", \"acrLoginServer\": \"$acr_login_server\", \"imageName\": \"$acr_image_name\"}" deployment_outputs.json > temp.json && mv temp.json deployment_outputs.json
    else
        print_warning "No deployment outputs found. Pushing to Docker Hub instead."
        docker push "$full_image_name"
    fi
}

# Function to update container app with new image
update_container_app() {
    if [ ! -f "deployment_outputs.json" ]; then
        print_error "deployment_outputs.json not found. Run infrastructure deployment first."
        exit 1
    fi
    
    local container_app=$(jq -r '.containerAppName' deployment_outputs.json)
    local resource_group=$(jq -r '.resourceGroupName' deployment_outputs.json)
    local image_name=$(jq -r '.imageName' deployment_outputs.json)
    
    if [ "$image_name" = "null" ]; then
        image_name="stilyafashionai/api:latest"
    fi
    
    print_status "Updating Container App with new image: $image_name"
    
    az containerapp update \
        --name "$container_app" \
        --resource-group "$resource_group" \
        --image "$image_name" \
        --output table
    
    print_status "Container App updated successfully"
}

# Function to verify deployment
verify_deployment() {
    if [ ! -f "deployment_outputs.json" ]; then
        print_error "deployment_outputs.json not found. Run infrastructure deployment first."
        exit 1
    fi
    
    local app_url=$(jq -r '.applicationUrl' deployment_outputs.json)
    
    print_status "Verifying deployment..."
    print_status "Application URL: $app_url"
    
    # Test health endpoint
    print_status "Testing health endpoint..."
    local health_check=$(curl -s -o /dev/null -w "%{http_code}" "$app_url/health" || echo "000")
    
    if [ "$health_check" = "200" ]; then
        print_status "Health check passed ✓"
    else
        print_warning "Health check failed (HTTP $health_check)"
    fi
    
    # Test API status
    print_status "Testing API status..."
    local status_check=$(curl -s -o /dev/null -w "%{http_code}" "$app_url/status" || echo "000")
    
    if [ "$status_check" = "200" ]; then
        print_status "API status check passed ✓"
    else
        print_warning "API status check failed (HTTP $status_check)"
    fi
    
    print_status "Deployment verification completed"
}

# Function to show deployment summary
show_summary() {
    if [ ! -f "deployment_outputs.json" ]; then
        print_warning "No deployment outputs found"
        return
    fi
    
    local app_url=$(jq -r '.applicationUrl' deployment_outputs.json)
    local key_vault=$(jq -r '.keyVaultName' deployment_outputs.json)
    local app_insights=$(jq -r '.applicationInsightsName' deployment_outputs.json)
    
    print_status "===================================="
    print_status "Stilya Fashion AI Deployment Summary"
    print_status "===================================="
    print_status "Application URL: $app_url"
    print_status "Key Vault: $key_vault"
    print_status "Application Insights: $app_insights"
    print_status "Resource Group: $RESOURCE_GROUP_NAME"
    print_status "===================================="
    print_status "Deployment completed successfully! 🎉"
}

# Main execution
main() {
    print_status "Starting Stilya Fashion AI deployment to Azure"
    
    # Check prerequisites
    check_azure_cli
    check_azure_login
    
    # Parse command line arguments
    case "${1:-all}" in
        "infra")
            create_resource_group
            deploy_infrastructure
            configure_key_vault_access
            ;;
        "secrets")
            upload_secrets
            ;;
        "build")
            build_and_push_image
            ;;
        "update")
            update_container_app
            ;;
        "verify")
            verify_deployment
            ;;
        "all")
            create_resource_group
            deploy_infrastructure
            configure_key_vault_access
            upload_secrets
            build_and_push_image
            update_container_app
            verify_deployment
            show_summary
            ;;
        *)
            echo "Usage: $0 [infra|secrets|build|update|verify|all]"
            echo "  infra   - Deploy Azure infrastructure only"
            echo "  secrets - Upload secrets to Key Vault only"
            echo "  build   - Build and push Docker image only"
            echo "  update  - Update Container App with new image only"
            echo "  verify  - Verify deployment only"
            echo "  all     - Run complete deployment (default)"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"