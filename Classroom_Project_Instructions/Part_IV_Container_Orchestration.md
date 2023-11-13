# Part 4 - Container Orchestration with Kubernetes

## Prerequisites
We will need to set up our CLI to interface with Kubernetes, our Kubernetes cluster in EKS, and connecting our CLI tool with the newly-created cluster.

### kubectl
For this section we will need to use `kubectl`. Verify that you have the `kubectl` utility installed locally by running the following command:
```bash
kubectl version --short
```
This should print a response with a `Client Version` if it's successful.

### EKS Cluster Creation
We will be creating an EKS cluster with the AWS console.

Follow the instructions provided by AWS on [Creating an Amazon EKS Cluster](https://docs.aws.amazon.com/eks/latest/userguide/create-cluster.html).

Make sure that you are following the steps for _AWS Management Console_ and not _eksctl_ or _AWS CLI_ (you are welcome to try creating a cluster with these alternate methods, but this course will be supporting the _AWS Management Console_ workflow).

During the creation process, the EKS console will provide dropdown menus for selecting options such as IAM roles and VPCs. If none exist for you, follow the documentation that are linked in the EKS console.

#### Tips
* For the _Cluster Service Role_ in the creation process, create an [AWS role](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html) for EKS. Make sure you attach the policies for `AmazonEKSClusterPolicy`, `AmazonEC2ContainerServiceFullAccess`, and `AmazonEKSServicePolicy`.
* If you don't have a [VPC](https://docs.aws.amazon.com/vpc/latest/userguide/how-it-works.html), create one with the `IPv4 CIDR block` value `10.0.0.0/16`. Make sure you select `No IPv6 CIDR block`.
* Your _Cluster endpoint access_ should be set to _Public_
* Your cluster may take ~20 minutes to be created. Once it's ready, it should be marked with an _Active_ status.

> We use the AWS console and `kubectl` to create and interface with EKS. <a href="https://eksctl.io/introduction/#installation" target="_blank">eksctl</a> is an AWS-supported tool for creating clusters through a CLI interface. Note that we will provide limited support if you choose to use `eksctl` to manage your cluster.

### EKS Node Groups
Once your cluster is created, we will need to add Node Groups so that the cluster has EC2 instances to process the workloads.

Follow the instructions provided by AWS on [Creating a Managed Node Group](https://docs.aws.amazon.com/eks/latest/userguide/create-managed-node-group.html). Similar to before, make sure you're following the steps for _AWS Management Console_.

#### Tips
* For the _Node IAM Role_ in the creation process, create an [AWS role](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html) for EKS Node Groups. Make sure you attach the policies for `AmazonEKSWorkerNodePolicy`, `AmazonEC2ContainerRegistryReadOnly`, and `AmazonEKS_CNI_Policy`.
* We recommend using `m5.large` instance types
* We recommend setting 2 minimum nodes, 3 maximum nodes


### Connecting kubectl with EKS
Follow the instructions provided by AWS on [Create a kubeconfig for Amazon EKS](https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html). This will make it such that your `kubectl` will be running against your newly-created EKS cluster.

#### Verify Cluster and Connection
Once `kubectl` is configured to communicate with your EKS cluster, run the following to validate that it's working:
```bash
kubectl get nodes
```
This should return information regarding the nodes that were created in your EKS clusteer.


### Deployment
In this step, you will deploy the Docker containers for the frontend web application and backend API applications in their respective pods.

Recall that while splitting the monolithic app into microservices, you used the values saved in the environment variables, as well as AWS CLI was configured locally. Similar values are required while instantiating containers from the Dockerhub images. 

1. **ConfigMap:** Create `env-configmap.yaml`, and save all your configuration values (non-confidential environments variables) in that file. 


2. **Secret:** Do not store the PostgreSQL username and passwords in the `env-configmap.yaml` file. Instead, create `env-secret.yaml` file to store the confidential values, such as login credentials. Unlike the AWS credentials, these values do not need to be Base64 encoded.


3. **Secret:** Create *aws-secret.yaml* file to store your AWS login credentials. Replace `___INSERT_AWS_CREDENTIALS_FILE__BASE64____` with the Base64 encoded credentials (not the regular username/password). 
     * Mac/Linux users: If you've configured your AWS CLI locally, check the contents of `~/.aws/credentials` file using `cat ~/.aws/credentials` . It will display the `aws_access_key_id` and `aws_secret_access_key` for your AWS profile(s). Now, you need to select the applicable pair of `aws_access_key` from the output of the `cat` command above and convert that string into `base64` . You use commands, such as:
```bash
# Use a combination of head/tail command to identify lines you want to convert to base64
# You just need two correct lines: a right pair of aws_access_key_id and aws_secret_access_key
cat ~/.aws/credentials | tail -n 5 | head -n 2
# Convert 
cat ~/.aws/credentials | tail -n 5 | head -n 2 | base64
```
     * **Windows users:** Copy a pair of *aws_access_key* from the AWS credential file and paste it into the encoding field of this third-party website: https://www.base64encode.org/ (or any other). Encode and copy/paste the result back into the *aws-secret.yaml*  file.

<br data-md>


4. **Deployment configuration:** Create *deployment.yaml* file individually for each service. While defining container specs, make sure to specify the same images you've pushed to the Dockerhub earlier. Ultimately, the frontend web application and backend API applications should run in their respective pods.

5. **Service configuration: **Similarly, create the *service.yaml* file thereby defining the right services/ports mapping.


Once, all deployment and service files are ready, you can use commands like:
```bash
# Apply env variables and secrets
kubectl apply -f aws-secret.yaml
kubectl apply -f env-secret.yaml
kubectl apply -f env-configmap.yaml
# Deployments - Double check the Dockerhub image name and version in the deployment files
kubectl apply -f backend-feed-deployment.yaml
# Do the same for other three deployment files
# Service
kubectl apply -f backend-feed-service.yaml
# Do the same for other three service files
```
Make sure to check the image names in the deployment files above. 



## Connecting k8s services to access the application

If the deployment is successful, and services are created, there are two options to access the application:
1. If you deployed the services as CLUSTERIP, then you will have to [forward a local port to a port on the "frontend" Pod](https://kubernetes.io/docs/tasks/access-application-cluster/port-forward-access-application-cluster/#forward-a-local-port-to-a-port-on-the-pod). In this case, you don't need to change the URL variable locally. 


2. If you exposed the "frontend" deployment using a Load Balancer's External IP, then you'll have to update the URL environment variable locally, and re-deploy the images with updated env variables. 

Below, we have explained method #2, as mentioned above. 

### Expose External IP

Use this link to <a href="https://kubernetes.io/docs/tutorials/stateless-application/expose-external-ip-address/" target="_blank">expose an External IP</a> address to access your application in the EKS Cluster.

```bash
# Check the deployment names and their pod status
kubectl get deployments
# Create a Service object that exposes the frontend deployment:
kubectl expose deployment frontend --type=LoadBalancer --name=publicfrontend
kubectl get services publicfrontend
# Note down the External IP, such as 
# a5e34958a2ca14b91b020d8aeba87fbb-1366498583.us-east-1.elb.amazonaws.com
# Check name, ClusterIP, and External IP of all deployments
kubectl get services 
```


### Update the environment variables 

Once you have the External IP of your front end and reverseproxy deployment, Change the API endpoints in the following places locally:

* Environment variables - Replace the http://**localhost**:8100 string with the Cluster-IP of the *frontend* service.  After replacing run `source ~/.zshrc` and verify using `echo $URL`



*  *udagram-deployment/env-configmap.yaml* file - Replace http://localhost:8100 string with the Cluster IP of the *frontend*. 



* *udagram-frontend/src/environments/environment.ts* file - Replace 'http://localhost:8080/api/v0' string with either the Cluster IP of the *reverseproxy* deployment.  



*  *udagram-frontend/src/environments/environment.prod.ts* - Replace 'http://localhost:8080/api/v0' string. 



* Retag in the `.travis.yaml` (say use v3, v4, v5, ...) as well as deployment YAML files

Then, push your changes to the Github repo. Travis will automatically build and re-push images to your Dockerhub. 
Next, re-apply configmap and re-deploy to the k8s cluster.
```bash
kubectl apply -f env-configmap.yaml
# Rolling update "frontend" containers of "frontend" deployment, updating the image
kubectl set image deployment frontend frontend=sudkul/udagram-frontend:v3
# Do the same for other three deployments
```
Check your deployed application at the External IP of your *publicfrontend* service. 

>**Note**: There can be multiple ways of setting up the deployment in the k8s cluster. As long as your deployment is successful, and fulfills [Project Rubric](https://review.udacity.com/#!/rubrics/2804/view), you are good go ahead!

## Troubleshoot
1. Use this command to see the STATUS of your pods:
```bash
kubectl get pods
kubectl describe pod <pod-id>
# An example:
# kubectl logs backend-user-5667798847-knvqz
# Error from server (BadRequest): container "backend-user" in pod "backend-user-5667798847-knvqz" is waiting to start: trying and failing to pull image
```
In case of `ImagePullBackOff` or `ErrImagePull` or `CrashLoopBackOff`, review your deployment.yaml file(s) if they have the right image path. 


2. Look at what's there inside the running container. [Open a Shell to a running container](https://kubernetes.io/docs/tasks/debug-application-cluster/get-shell-running-container/) as:
```bash
kubectl get pods
# Assuming "backend-feed-68d5c9fdd6-dkg8c" is a pod
kubectl exec --stdin --tty backend-feed-68d5c9fdd6-dkg8c -- /bin/bash
# See what values are set for environment variables in the container
printenv | grep POST
# Or, you can try "curl <cluster-IP-of-backend>:8080/api/v0/feed " to check if services are running.
# This is helpful to see is backend is working by opening a bash into the frontend container
```

3. When you are sure that all pods are running successfully, then use developer tools in the browser to see the precise reason for the error. 
  - If your frontend is loading properly, and showing *Error: Uncaught (in promise): HttpErrorResponse: {"headers":{"normalizedNames":{},"lazyUpdate":null,"headers":{}},"status":0,"statusText":"Unknown Error"....*, it is possibly because the *udagram-frontend/src/environments/environment.ts* file has incorrectly defined the ‘apiHost’ to whom forward the requests. 
  - If your frontend is **not** not loading, and showing *Error: Uncaught (in promise): HttpErrorResponse: {"headers":{"normalizedNames":{},"lazyUpdate":null,"headers":{}},"status":0,"statusText":"Unknown Error", ....* , it is possibly because URL variable is not set correctly. 
  - In the case of *Failed to load resource: net::ERR_CONNECTION_REFUSED* error as well, it is possibly because the URL variable is not set correctly.

## Screenshots
So that we can verify that your project is deployed, please include the screenshots of the following commands with your completed project. 
```bash
# Kubernetes pods are deployed properly
kubectl get pods 
# Kubernetes services are set up properly
kubectl describe services
# You have horizontal scaling set against CPU usage
kubectl describe hpa
```

```
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
kubectl apply -f set-env-secret.yaml
kubectl apply -f set-env-configmap.yaml
kubectl apply -f aws-secret.yaml
kubectl apply -f backend-user-deployment.yaml
kubectl apply -f backend-feed-deployment.yaml
kubectl apply -f reverseproxy.yaml
kubectl expose deployment reverseproxy --type=LoadBalancer --name=reverseproxy-ep --port=8080

edit in file deployement v2
docker build -t udagram-frontend ./udagram-frontend
docker tag udagram-frontend alannguyen23/udagram-frontend:v2
docker push alannguyen23/udagram-frontend:v1

kubectl apply -f frontend.yaml
// tao load balance new thi moi appply code
kubectl expose deployment reverseproxy --type=LoadBalancer --name=reverseproxy-ep --port=8080

Check thong tin node deployments: kubectl describe pod frontend-9f496689b-9vb4h

```
```
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
serviceaccount/metrics-server unchanged
clusterrole.rbac.authorization.k8s.io/system:aggregated-metrics-reader unchanged
clusterrole.rbac.authorization.k8s.io/system:metrics-server configured
rolebinding.rbac.authorization.k8s.io/metrics-server-auth-reader unchanged
clusterrolebinding.rbac.authorization.k8s.io/metrics-server:system:auth-delegator unchanged
clusterrolebinding.rbac.authorization.k8s.io/system:metrics-server unchanged
service/metrics-server unchanged
deployment.apps/metrics-server configured
apiservice.apiregistration.k8s.io/v1beta1.metrics.k8s.io unchanged
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> kubectl apply -f set-env-secret.yaml
error: the path "set-env-secret.yaml" does not exist
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> kubectl apply -f set-env-configmap.yaml
error: the path "set-env-configmap.yaml" does not exist
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> kubectl apply -f aws-secret.yaml
error: the path "aws-secret.yaml" does not exist
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> kubectl apply -f backend-user-deployment.yaml
error: the path "backend-user-deployment.yaml" does not exist
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> kubectl apply -f backend-feed-deployment.yaml
error: the path "backend-feed-deployment.yaml" does not exist
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> cd .\project-deployment\          
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
serviceaccount/metrics-server unchanged
clusterrole.rbac.authorization.k8s.io/system:aggregated-metrics-reader unchanged
clusterrole.rbac.authorization.k8s.io/system:metrics-server unchanged
rolebinding.rbac.authorization.k8s.io/metrics-server-auth-reader unchanged
clusterrolebinding.rbac.authorization.k8s.io/metrics-server:system:auth-delegator unchanged
clusterrolebinding.rbac.authorization.k8s.io/system:metrics-server unchanged
service/metrics-server unchanged
deployment.apps/metrics-server configured
apiservice.apiregistration.k8s.io/v1beta1.metrics.k8s.io unchanged
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f set-env-secret.yaml
error: the path "set-env-secret.yaml" does not exist
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f set-env-configmap.yaml
error: the path "set-env-configmap.yaml" does not exist
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f aws-secret.yaml
secret/aws-secret configured
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f backend-user-deployment.yaml
deployment.apps/backend-user configured
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f backend-feed-deployment.yaml
deployment.apps/backend-feed configured
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f reverseproxy.yaml
error: the path "reverseproxy.yaml" does not exist
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f .\backend-reverseproxy-deployment.yaml
deployment.apps/reverseproxy configured
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl expose deployment reverseproxy --type=LoadBalancer --name=reverseproxy-ep --port=8080
service/reverseproxy-ep exposed
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl get services
NAME              TYPE           CLUSTER-IP       EXTERNAL-IP                                                               PORT(S)          AGE
backend-feed      ClusterIP      172.20.205.234   <none>                                                                    8080/TCP         13h
backend-user      ClusterIP      172.20.175.56    <none>                                                                    8080/TCP         13h
frontend          ClusterIP      172.20.241.119   <none>                                                                    8100/TCP         13h
kubernetes        ClusterIP      172.20.0.1       <none>                                                                    443/TCP          32h
publicfrontend    LoadBalancer   172.20.208.184   a9aeb4eb1930c4500be543e0a4226191-1487978401.us-east-1.elb.amazonaws.com   80:32443/TCP     13h
publicr           LoadBalancer   172.20.120.120   a3feff7c680ff457cae7610165799167-399403798.us-east-1.elb.amazonaws.com    8080:32700/TCP   13h
reverseproxy      ClusterIP      172.20.204.178   <none>                                                                    8080/TCP         13h
reverseproxy-ep   LoadBalancer   172.20.56.223    a992a3f46d8684341be1c7acd235c565-829279486.us-east-1.elb.amazonaws.com    8080:30749/TCP   14s
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> ^C
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> ^C
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> docker build -t udagram-frontend ./udagram-frontend                    
[+] Building 0.0s (0/0)                                                                                                                                                                  docker:default
ERROR: unable to prepare context: path "./udagram-frontend" not found
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> cd ..
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> docker build -t udagram-frontend ./udagram-frontend
[+] Building 19.3s (17/17) FINISHED                                                                                                                                                      docker:default
 => [internal] load .dockerignore                                                                                                                                                                  0.0s
 => => transferring context: 52B                                                                                                                                                                   0.0s 
 => [internal] load build definition from Dockerfile                                                                                                                                               0.0s 
 => => transferring dockerfile: 508B                                                                                                                                                               0.0s 
 => [internal] load metadata for docker.io/library/nginx:alpine                                                                                                                                    2.9s 
 => [internal] load metadata for docker.io/library/node:16                                                                                                                                         2.1s 
 => [auth] library/node:pull token for registry-1.docker.io                                                                                                                                        0.0s
 => [auth] library/nginx:pull token for registry-1.docker.io                                                                                                                                       0.0s 
 => [build 1/7] FROM docker.io/library/node:16@sha256:f77a1aef2da8d83e45ec990f45df50f1a286c5fe8bbfb8c6e4246c6389705c0b                                                                             0.0s
 => [internal] load build context                                                                                                                                                                  0.0s 
 => => transferring context: 6.70kB                                                                                                                                                                0.0s 
 => [stage-1 1/2] FROM docker.io/library/nginx:alpine@sha256:db353d0f0c479c91bd15e01fc68ed0f33d9c4c52f3415e63332c3d0bf7a4bb77                                                                      0.0s 
 => CACHED [build 2/7] WORKDIR /usr/src/app                                                                                                                                                        0.0s 
 => CACHED [build 3/7] COPY package*.json ./                                                                                                                                                       0.0s 
 => CACHED [build 4/7] RUN npm i -f                                                                                                                                                                0.0s 
 => CACHED [build 5/7] RUN npm install -g @ionic/cli                                                                                                                                               0.0s 
 => [build 6/7] COPY . .                                                                                                                                                                           0.1s 
 => [build 7/7] RUN ionic build                                                                                                                                                                   13.8s
 => CACHED [stage-1 2/2] COPY --from=build  /usr/src/app/www /usr/share/nginx/html                                                                                                                 0.0s
 => exporting to image                                                                                                                                                                             0.0s
 => => exporting layers                                                                                                                                                                            0.0s
 => => writing image sha256:cda4cc4853df937ae7a2ed264e58eaea6f920c0feb41bcfcf677cdd06ff3846b                                                                                                       0.0s
 => => naming to docker.io/library/udagram-frontend                                                                                                                                                0.0s

What's Next?
  View a summary of image vulnerabilities and recommendations → docker scout quickview
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> docker tag udagram-frontend nvnhan/udagram-frontend:v2
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> docker push alannguyen23/udagram-frontend:v2
The push refers to repository [docker.io/alannguyen23/udagram-frontend]
tag does not exist: alannguyen23/udagram-frontend:v2
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> docker push alannguyen23/udagram-frontend:v1
The push refers to repository [docker.io/alannguyen23/udagram-frontend]
b99fa7fefcd4: Pushed
4b701b99fec7: Layer already exists
01e36c0e0b84: Layer already exists
901e6dddcc99: Layer already exists
f126bda54112: Layer already exists
38067ed663bf: Layer already exists
854101110f63: Layer already exists
81fdcc81a9d0: Layer already exists
cc2447e1835a: Layer already exists
v1: digest: sha256:1e256500b280660fb4a6df4bafe3af86131f598f94edd3a36af75f4de6683e99 size: 2200
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> cd .\project-deployment\
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f .\frontend-deployment.yaml
deployment.apps/frontend configured
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl expose deployment frontend --type=LoadBalancer --name=frontend-ep
service/frontend-ep exposed
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl autoscale deployment api-user --cpu-percent=70 --min=3 --max=5
Error from server (NotFound): deployments.apps "api-user" not found
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl get services
NAME              TYPE           CLUSTER-IP       EXTERNAL-IP                                                               PORT(S)          AGE
backend-feed      ClusterIP      172.20.205.234   <none>                                                                    8080/TCP         13h
backend-user      ClusterIP      172.20.175.56    <none>                                                                    8080/TCP         13h
frontend          ClusterIP      172.20.241.119   <none>                                                                    8100/TCP         13h
frontend-ep       LoadBalancer   172.20.165.235   a182a737e36cc42a39188efd5484497d-330640007.us-east-1.elb.amazonaws.com    80:30380/TCP     43s
kubernetes        ClusterIP      172.20.0.1       <none>                                                                    443/TCP          32h
publicfrontend    LoadBalancer   172.20.208.184   a9aeb4eb1930c4500be543e0a4226191-1487978401.us-east-1.elb.amazonaws.com   80:32443/TCP     13h
publicr           LoadBalancer   172.20.120.120   a3feff7c680ff457cae7610165799167-399403798.us-east-1.elb.amazonaws.com    8080:32700/TCP   13h
reverseproxy      ClusterIP      172.20.204.178   <none>                                                                    8080/TCP         13h
reverseproxy-ep   LoadBalancer   172.20.56.223    a992a3f46d8684341be1c7acd235c565-829279486.us-east-1.elb.amazonaws.com    8080:30749/TCP   7m8s
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl autoscale deployment bacjend-feed --cpu-percent=70 --min=3 --max=5
Error from server (NotFound): deployments.apps "bacjend-feed" not found
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl autoscale deployment backend-feed --cpu-percent=70 --min=3 --max=5
Error from server (AlreadyExists): horizontalpodautoscalers.autoscaling "backend-feed" already exists
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl describe hpa
Name:                                                  backend-feed
Namespace:                                             default
Labels:                                                <none>
Annotations:                                           <none>
CreationTimestamp:                                     Mon, 13 Nov 2023 06:56:11 +0700
Reference:                                             Deployment/backend-feed
Metrics:                                               ( current / target )
  resource cpu on pods  (as a percentage of request):  0% (0) / 70%
Min replicas:                                          3
Max replicas:                                          5
Deployment pods:                                       3 current / 3 desired
Conditions:
  Type            Status  Reason            Message
  ----            ------  ------            -------
  AbleToScale     True    ReadyForNewScale  recommended size matches current size
  ScalingActive   True    ValidMetricFound  the HPA was able to successfully calculate a replica count from cpu resource utilization (percentage of request)
  ScalingLimited  True    TooFewReplicas    the desired replica count is less than the minimum replica count
Events:
  Type     Reason                   Age                   From                       Message
  ----     ------                   ----                  ----                       -------
  Warning  FailedGetResourceMetric  15m (x2760 over 11h)  horizontal-pod-autoscaler  failed to get cpu utilization: unable to get metrics for resource cpu: unable to fetch metrics from resource metrics API: the server is currently unable to handle the request (get pods.metrics.k8s.io)
  Normal   SuccessfulRescale        9m53s (x2 over 12h)   horizontal-pod-autoscaler  New size: 3; reason: Current number of replicas below Spec.MinReplicas
  Normal   SuccessfulRescale        3m38s                 horizontal-pod-autoscaler  New size: 4; reason: All metrics below target


Name:                                                  backend-user
Namespace:                                             default
Labels:                                                <none>
Annotations:                                           <none>
CreationTimestamp:                                     Mon, 13 Nov 2023 06:57:19 +0700
Reference:                                             Deployment/backend-user
Metrics:                                               ( current / target )
  resource cpu on pods  (as a percentage of request):  0% (0) / 70%
Min replicas:                                          3
Max replicas:                                          5
Deployment pods:                                       3 current / 3 desired
Conditions:
  Type            Status  Reason            Message
  ----            ------  ------            -------
  AbleToScale     True    ReadyForNewScale  recommended size matches current size
  ScalingActive   True    ValidMetricFound  the HPA was able to successfully calculate a replica count from cpu resource utilization (percentage of request)
  ScalingLimited  True    TooFewReplicas    the desired replica count is less than the minimum replica count
Events:
  Type     Reason                   Age                   From                       Message
  ----     ------                   ----                  ----                       -------
  Warning  FailedGetResourceMetric  15m (x2760 over 11h)  horizontal-pod-autoscaler  failed to get cpu utilization: unable to get metrics for resource cpu: unable to fetch metrics from resource metrics API: the server is currently unable to handle the request (get pods.metrics.k8s.io)
  Normal   SuccessfulRescale        9m53s (x2 over 12h)   horizontal-pod-autoscaler  New size: 3; reason: Current number of replicas below Spec.MinReplicas
  Normal   SuccessfulRescale        3m38s                 horizontal-pod-autoscaler  New size: 3; reason: All metrics below target
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment>  kubectl get services
NAME              TYPE           CLUSTER-IP       EXTERNAL-IP                                                               PORT(S)          AGE
backend-feed      ClusterIP      172.20.205.234   <none>                                                                    8080/TCP         13h
backend-user      ClusterIP      172.20.175.56    <none>                                                                    8080/TCP         13h
frontend          ClusterIP      172.20.241.119   <none>                                                                    8100/TCP         13h
frontend-ep       LoadBalancer   172.20.165.235   a182a737e36cc42a39188efd5484497d-330640007.us-east-1.elb.amazonaws.com    80:30380/TCP     2m7s
kubernetes        ClusterIP      172.20.0.1       <none>                                                                    443/TCP          32h
publicfrontend    LoadBalancer   172.20.208.184   a9aeb4eb1930c4500be543e0a4226191-1487978401.us-east-1.elb.amazonaws.com   80:32443/TCP     13h
publicr           LoadBalancer   172.20.120.120   a3feff7c680ff457cae7610165799167-399403798.us-east-1.elb.amazonaws.com    8080:32700/TCP   13h
reverseproxy      ClusterIP      172.20.204.178   <none>                                                                    8080/TCP         13h
reverseproxy-ep   LoadBalancer   172.20.56.223    a992a3f46d8684341be1c7acd235c565-829279486.us-east-1.elb.amazonaws.com    8080:30749/TCP   8m32s
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> docker build -t udagram-frontend ./udagram-frontend
[+] Building 0.0s (0/0)                                                                                                                                                                  docker:default
ERROR: unable to prepare context: path "./udagram-frontend" not found
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> cd ..
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> docker build -t udagram-frontend ./udagram-frontend
[+] Building 24.0s (17/17) FINISHED                                                                                                                                                      docker:default
 => [internal] load .dockerignore                                                                                                                                                                  0.0s
 => => transferring context: 52B                                                                                                                                                                   0.0s 
 => [internal] load build definition from Dockerfile                                                                                                                                               0.0s 
 => => transferring dockerfile: 508B                                                                                                                                                               0.0s 
 => [internal] load metadata for docker.io/library/nginx:alpine                                                                                                                                    2.5s 
 => [internal] load metadata for docker.io/library/node:16                                                                                                                                         1.8s 
 => [auth] library/nginx:pull token for registry-1.docker.io                                                                                                                                       0.0s
 => [auth] library/node:pull token for registry-1.docker.io                                                                                                                                        0.0s 
 => CACHED [stage-1 1/2] FROM docker.io/library/nginx:alpine@sha256:db353d0f0c479c91bd15e01fc68ed0f33d9c4c52f3415e63332c3d0bf7a4bb77                                                               0.0s
 => [build 1/7] FROM docker.io/library/node:16@sha256:f77a1aef2da8d83e45ec990f45df50f1a286c5fe8bbfb8c6e4246c6389705c0b                                                                             0.0s 
 => [internal] load build context                                                                                                                                                                  0.0s 
 => => transferring context: 7.57kB                                                                                                                                                                0.0s 
 => CACHED [build 2/7] WORKDIR /usr/src/app                                                                                                                                                        0.0s
 => CACHED [build 3/7] COPY package*.json ./                                                                                                                                                       0.0s 
 => CACHED [build 4/7] RUN npm i -f                                                                                                                                                                0.0s 
 => CACHED [build 5/7] RUN npm install -g @ionic/cli                                                                                                                                               0.0s 
 => [build 6/7] COPY . .                                                                                                                                                                           0.2s 
 => [build 7/7] RUN ionic build                                                                                                                                                                   15.2s
 => [stage-1 2/2] COPY --from=build  /usr/src/app/www /usr/share/nginx/html                                                                                                                        0.2s
 => exporting to image                                                                                                                                                                             0.2s
 => => exporting layers                                                                                                                                                                            0.1s
 => => writing image sha256:7e403ed982908a7999b519f2381aabdf875d2e205d1544add1f8089a1a8dcf76                                                                                                       0.0s
 => => naming to docker.io/library/udagram-frontend                                                                                                                                                0.0s

What's Next?
  View a summary of image vulnerabilities and recommendations → docker scout quickview
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> docker tag udagram-frontend nvnhan/udagram-frontend:v1
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> docker push alannguyen23/udagram-frontend:v1
The push refers to repository [docker.io/alannguyen23/udagram-frontend]
b99fa7fefcd4: Layer already exists
4b701b99fec7: Layer already exists
01e36c0e0b84: Layer already exists
901e6dddcc99: Layer already exists
f126bda54112: Layer already exists
38067ed663bf: Layer already exists
854101110f63: Layer already exists
81fdcc81a9d0: Layer already exists
cc2447e1835a: Layer already exists
v1: digest: sha256:1e256500b280660fb4a6df4bafe3af86131f598f94edd3a36af75f4de6683e99 size: 2200
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> kubectl expose deployment frontend --type=LoadBalancer --name=frontend-ep
Error from server (AlreadyExists): services "frontend-ep" already exists
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> cd dep
cd : Cannot find path 'C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\dep' because it does not exist.
At line:1 char:1
+ cd dep
+ ~~~~~~
    + CategoryInfo          : ObjectNotFound: (C:\Users\QuangG...ces-project\dep:String) [Set-Location], ItemNotFoundException
    + FullyQualifiedErrorId : PathNotFound,Microsoft.PowerShell.Commands.SetLocationCommand

PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> cd .\project-deployment\
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f .\frontend-deployment.yaml
deployment.apps/frontend configured
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl expose deployment frontend --type=LoadBalancer --name=frontend-ep
Error from server (AlreadyExists): services "frontend-ep" already exists
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl set image deployment frontend frontend=alannguyen23/udagram-frontend:v1        
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl get services                                                           
NAME              TYPE           CLUSTER-IP       EXTERNAL-IP                                                               PORT(S)          AGE
backend-feed      ClusterIP      172.20.205.234   <none>                                                                    8080/TCP         13h
backend-user      ClusterIP      172.20.175.56    <none>                                                                    8080/TCP         13h
frontend          ClusterIP      172.20.241.119   <none>                                                                    8100/TCP         13h
frontend-ep       LoadBalancer   172.20.165.235   a182a737e36cc42a39188efd5484497d-330640007.us-east-1.elb.amazonaws.com    80:30380/TCP     9m14s
kubernetes        ClusterIP      172.20.0.1       <none>                                                                    443/TCP          32h
publicfrontend    LoadBalancer   172.20.208.184   a9aeb4eb1930c4500be543e0a4226191-1487978401.us-east-1.elb.amazonaws.com   80:32443/TCP     13h
publicr           LoadBalancer   172.20.120.120   a3feff7c680ff457cae7610165799167-399403798.us-east-1.elb.amazonaws.com    8080:32700/TCP   13h
reverseproxy      ClusterIP      172.20.204.178   <none>                                                                    8080/TCP         13h
reverseproxy-ep   LoadBalancer   172.20.56.223    a992a3f46d8684341be1c7acd235c565-829279486.us-east-1.elb.amazonaws.com    8080:30749/TCP   15m
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> ^C
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl set image deployment frontend publicfrontend=alannguyen23/udagram-frontend:v1
error: unable to find container named "publicfrontend"
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl set image deployment publicfrontend frontend=alannguyen23/udagram-frontend:v1
Error from server (NotFound): deployments.apps "publicfrontend" not found
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl expose deployment frontend --type=LoadBalancer --name=frontend-ep2
service/frontend-ep2 exposed
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl autoscale deployment api-user --cpu-percent=70 --min=3 --max=5
Error from server (NotFound): deployments.apps "api-user" not found
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl autoscale deployment api-user --cpu-percent=70 --min=3 --max=5
Error from server (NotFound): deployments.apps "api-user" not found
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl get services 
NAME              TYPE           CLUSTER-IP       EXTERNAL-IP                                                               PORT(S)          AGE
backend-feed      ClusterIP      172.20.205.234   <none>                                                                    8080/TCP         14h
backend-user      ClusterIP      172.20.175.56    <none>                                                                    8080/TCP         14h
frontend          ClusterIP      172.20.241.119   <none>                                                                    8100/TCP         14h
frontend-ep       LoadBalancer   172.20.165.235   a182a737e36cc42a39188efd5484497d-330640007.us-east-1.elb.amazonaws.com    80:30380/TCP     11m
frontend-ep2      LoadBalancer   172.20.236.205   ac4093e0a9bad42098f21ede1c0a5052-378288480.us-east-1.elb.amazonaws.com    80:31968/TCP     31s
kubernetes        ClusterIP      172.20.0.1       <none>                                                                    443/TCP          32h
publicfrontend    LoadBalancer   172.20.208.184   a9aeb4eb1930c4500be543e0a4226191-1487978401.us-east-1.elb.amazonaws.com   80:32443/TCP     13h
publicr           LoadBalancer   172.20.120.120   a3feff7c680ff457cae7610165799167-399403798.us-east-1.elb.amazonaws.com    8080:32700/TCP   13h
reverseproxy      ClusterIP      172.20.204.178   <none>                                                                    8080/TCP         14h
reverseproxy-ep   LoadBalancer   172.20.56.223    a992a3f46d8684341be1c7acd235c565-829279486.us-east-1.elb.amazonaws.com    8080:30749/TCP   18m
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> ^C
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> docker build -t udagram-frontend ./udagram-frontend
[+] Building 0.0s (0/0)                                                                                                                                                                  docker:default
ERROR: unable to prepare context: path "./udagram-frontend" not found
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> cd ..
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> docker build -t udagram-frontend ./udagram-frontend
[+] Building 2.9s (17/17) FINISHED                                                                                                                                                       docker:default
 => [internal] load .dockerignore                                                                                                                                                                  0.0s
 => => transferring context: 52B                                                                                                                                                                   0.0s 
 => [internal] load build definition from Dockerfile                                                                                                                                               0.0s 
 => => transferring dockerfile: 508B                                                                                                                                                               0.0s 
 => [internal] load metadata for docker.io/library/nginx:alpine                                                                                                                                    2.7s 
 => [internal] load metadata for docker.io/library/node:16                                                                                                                                         1.8s 
 => [auth] library/node:pull token for registry-1.docker.io                                                                                                                                        0.0s
 => [auth] library/nginx:pull token for registry-1.docker.io                                                                                                                                       0.0s 
 => [stage-1 1/2] FROM docker.io/library/nginx:alpine@sha256:db353d0f0c479c91bd15e01fc68ed0f33d9c4c52f3415e63332c3d0bf7a4bb77                                                                      0.0s
 => [build 1/7] FROM docker.io/library/node:16@sha256:f77a1aef2da8d83e45ec990f45df50f1a286c5fe8bbfb8c6e4246c6389705c0b                                                                             0.0s 
 => [internal] load build context                                                                                                                                                                  0.0s 
 => => transferring context: 5.89kB                                                                                                                                                                0.0s 
 => CACHED [build 2/7] WORKDIR /usr/src/app                                                                                                                                                        0.0s 
 => CACHED [build 3/7] COPY package*.json ./                                                                                                                                                       0.0s 
 => CACHED [build 4/7] RUN npm i -f                                                                                                                                                                0.0s 
 => CACHED [build 5/7] RUN npm install -g @ionic/cli                                                                                                                                               0.0s 
 => CACHED [build 6/7] COPY . .                                                                                                                                                                    0.0s 
 => CACHED [build 7/7] RUN ionic build                                                                                                                                                             0.0s 
 => CACHED [stage-1 2/2] COPY --from=build  /usr/src/app/www /usr/share/nginx/html                                                                                                                 0.0s 
 => exporting to image                                                                                                                                                                             0.0s 
 => => exporting layers                                                                                                                                                                            0.0s 
 => => writing image sha256:7e403ed982908a7999b519f2381aabdf875d2e205d1544add1f8089a1a8dcf76                                                                                                       0.0s 
 => => naming to docker.io/library/udagram-frontend                                                                                                                                                0.0s 

What's Next?
  View a summary of image vulnerabilities and recommendations → docker scout quickview
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> docker tag udagram-frontend nvnhan/udagram-frontend:v1
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> docker tag udagram-frontend alannguyen23/udagram-frontend:v1
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> docker push alannguyen23/udagram-frontend:v1
The push refers to repository [docker.io/alannguyen23/udagram-frontend]
2bdd7f8e852b: Pushed
4b701b99fec7: Layer already exists
01e36c0e0b84: Layer already exists
901e6dddcc99: Layer already exists
f126bda54112: Layer already exists
38067ed663bf: Layer already exists
854101110f63: Layer already exists
81fdcc81a9d0: Layer already exists
cc2447e1835a: Layer already exists
v1: digest: sha256:46b975b397c100af4d108fbfd9494ef56aadb48abd094161b434a2a8652b613d size: 2200
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> cd pro
cd : Cannot find path 'C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\pro' because it does not exist.
At line:1 char:1
+ cd pro
+ ~~~~~~
    + CategoryInfo          : ObjectNotFound: (C:\Users\QuangG...ces-project\pro:String) [Set-Location], ItemNotFoundException
    + FullyQualifiedErrorId : PathNotFound,Microsoft.PowerShell.Commands.SetLocationCommand

PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> cd .\project-deployment\
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f .\frontend-deployment.yaml
deployment.apps/frontend configured
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl expose deployment frontend --type=LoadBalancer --name=frontend-ep3
service/frontend-ep3 exposed
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl get services      
NAME              TYPE           CLUSTER-IP       EXTERNAL-IP                                                               PORT(S)          AGE
backend-feed      ClusterIP      172.20.205.234   <none>                                                                    8080/TCP         14h
backend-user      ClusterIP      172.20.175.56    <none>                                                                    8080/TCP         14h
frontend          ClusterIP      172.20.241.119   <none>                                                                    8100/TCP         14h
frontend-ep       LoadBalancer   172.20.165.235   a182a737e36cc42a39188efd5484497d-330640007.us-east-1.elb.amazonaws.com    80:30380/TCP     18m
frontend-ep2      LoadBalancer   172.20.236.205   ac4093e0a9bad42098f21ede1c0a5052-378288480.us-east-1.elb.amazonaws.com    80:31968/TCP     7m6s
frontend-ep3      LoadBalancer   172.20.23.103    aefa9798391c04762ababa035e887399-1227445994.us-east-1.elb.amazonaws.com   80:30341/TCP     62s
kubernetes        ClusterIP      172.20.0.1       <none>                                                                    443/TCP          32h
publicfrontend    LoadBalancer   172.20.208.184   a9aeb4eb1930c4500be543e0a4226191-1487978401.us-east-1.elb.amazonaws.com   80:32443/TCP     14h
publicr           LoadBalancer   172.20.120.120   a3feff7c680ff457cae7610165799167-399403798.us-east-1.elb.amazonaws.com    8080:32700/TCP   13h
reverseproxy      ClusterIP      172.20.204.178   <none>                                                                    8080/TCP         14h
reverseproxy-ep   LoadBalancer   172.20.56.223    a992a3f46d8684341be1c7acd235c565-829279486.us-east-1.elb.amazonaws.com    8080:30749/TCP   24m
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> ^C
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl get pods
NAME                            READY   STATUS    RESTARTS   AGE
backend-feed-968fdc458-9bwq4    1/1     Running   0          29m
backend-feed-968fdc458-fz5qr    1/1     Running   0          31m
backend-feed-968fdc458-pvshf    1/1     Running   0          28m
backend-user-5584f8fc5b-449hj   1/1     Running   0          28m
backend-user-5584f8fc5b-959pj   1/1     Running   0          12h
backend-user-5584f8fc5b-hwt7t   1/1     Running   0          12h
frontend-bc6bff549-z6mth        1/1     Running   0          12h
frontend-bc6bff549-zjrcm        1/1     Running   0          12h
reverseproxy-54dcb98ffb-fvnsd   1/1     Running   0          12h
reverseproxy-54dcb98ffb-zl6pf   1/1     Running   0          12h
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl logs backend-user-5584f8fc5b-hwt7t

> udagram-api@2.0.0 prod
> tsc && node ./www/server.js

db02.ct07kuwzblwb.us-east-1.rds.amazonaws.com
Initialize database connection...
Executing (default): CREATE TABLE IF NOT EXISTS "User" ("email" VARCHAR(255) , "passwordHash" VARCHAR(255), "createdAt" TIMESTAMP WITH TIME ZONE, "updatedAt" TIMESTAMP WITH TIME ZONE, PRIMARY KEY ("email"));
Executing (default): SELECT i.relname AS name, ix.indisprimary AS primary, ix.indisunique AS unique, ix.indkey AS indkey, array_agg(a.attnum) as column_indexes, array_agg(a.attname) AS column_names, pg_get_indexdef(ix.indexrelid) AS definition FROM pg_class t, pg_class i, pg_index ix, pg_attribute a WHERE t.oid = ix.indrelid AND i.oid = ix.indexrelid AND a.attrelid = t.oid AND t.relkind = 'r' and t.relname = 'User' GROUP BY i.relname, ix.indexrelid, ix.indisprimary, ix.indisunique, ix.indkey ORDER BY i.relname;
server running http://localhost:8100
press CTRL+C to stop server
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl logs backend-user-5584f8fc5b-449hj 

> udagram-api@2.0.0 prod
> tsc && node ./www/server.js

db02.ct07kuwzblwb.us-east-1.rds.amazonaws.com
Initialize database connection...
Executing (default): CREATE TABLE IF NOT EXISTS "User" ("email" VARCHAR(255) , "passwordHash" VARCHAR(255), "createdAt" TIMESTAMP WITH TIME ZONE, "updatedAt" TIMESTAMP WITH TIME ZONE, PRIMARY KEY ("email"));
Executing (default): SELECT i.relname AS name, ix.indisprimary AS primary, ix.indisunique AS unique, ix.indkey AS indkey, array_agg(a.attnum) as column_indexes, array_agg(a.attname) AS column_names, pg_get_indexdef(ix.indexrelid) AS definition FROM pg_class t, pg_class i, pg_index ix, pg_attribute a WHERE t.oid = ix.indrelid AND i.oid = ix.indexrelid AND a.attrelid = t.oid AND t.relkind = 'r' and t.relname = 'User' GROUP BY i.relname, ix.indexrelid, ix.indisprimary, ix.indisunique, ix.indkey ORDER BY i.relname;
server running http://localhost:8100
press CTRL+C to stop server
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> cd ..                                      
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> git status
On branch main
Your branch is ahead of 'origin/main' by 1 commit.
  (use "git push" to publish your local commits)

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   .github/workflows/docker-image.yml
        modified:   project-deployment/aws-secret.yaml
        modified:   udagram-frontend/src/environments/environment.prod.ts
        modified:   udagram-frontend/src/environments/environment.ts

no changes added to commit (use "git add" and/or "git commit -a")
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> git pull 
remote: Enumerating objects: 8, done.
remote: Counting objects: 100% (3/3), done.
remote: Compressing objects: 100% (2/2), done.
remote: Total 8 (delta 2), reused 1 (delta 1), pack-reused 5
Unpacking objects: 100% (8/8), 127.41 KiB | 800.00 KiB/s, done.
From https://github.com/quang-vn26/Udacity-Cloud-Developer-project-3
   078cb71..1a25138  main       -> origin/main
Merge made by the 'ort' strategy.
 note_pr3                                     | 108 ---------------------------
 screenshots/1.png                            | Bin 0 -> 31136 bytes
 screenshots/Screenshot 2023-11-13 071448.png | Bin 0 -> 39954 bytes
 screenshots/Screenshot 2023-11-13 071505.png | Bin 0 -> 73143 bytes
 4 files changed, 108 deletions(-)
 delete mode 100644 note_pr3
 create mode 100644 screenshots/1.png
 create mode 100644 screenshots/Screenshot 2023-11-13 071448.png
 create mode 100644 screenshots/Screenshot 2023-11-13 071505.png
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> git status
On branch main
Your branch is ahead of 'origin/main' by 2 commits.
  (use "git push" to publish your local commits)

        modified:   udagram-frontend/src/environments/environment.prod.ts
        modified:   udagram-frontend/src/environments/environment.ts

no changes added to commit (use "git add" and/or "git commit -a")
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> git add .
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> git commit -m "update"
[main c576b7f] update
 4 files changed, 4 insertions(+), 4 deletions(-)
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> git push
Enumerating objects: 42, done.
Counting objects: 100% (31/31), done.
Delta compression using up to 16 threads
Compressing objects: 100% (16/16), done.
Writing objects: 100% (18/18), 1.66 KiB | 1.66 MiB/s, done.
Total 18 (delta 11), reused 0 (delta 0), pack-reused 0
remote: Resolving deltas: 100% (11/11), completed with 8 local objects.
To https://github.com/quang-vn26/Udacity-Cloud-Developer-project-3.git
   1a25138..c576b7f  main -> main
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project>




                                                                                   cd .\project-deployment\
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> ls


    Directory: C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment


Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----        11/13/2023   7:05 PM            235 aws-secret.yaml
-a----         11/9/2023   7:53 AM           2024 backend-feed-deployment.yaml
-a----         11/3/2023   7:39 AM            213 backend-feed-service.yaml
-a----         11/9/2023   7:53 AM            661 backend-reverseproxy-deployment.yaml
-a----         11/3/2023   7:39 AM            215 backend-reverseproxy-service.yaml
-a----         11/9/2023   7:53 AM           1498 backend-user-deployment.yaml
-a----         11/3/2023   7:39 AM            213 backend-user-service.yaml
-a----         11/9/2023   7:55 AM            291 env-configmap.yaml
-a----         11/9/2023   7:54 AM            150 env-secret.yaml
-a----        11/13/2023   7:18 AM            683 frontend-deployment.yaml
-a----         11/3/2023   7:39 AM            200 frontend-service.yaml


PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f set-env-secret.yaml
error: the path "set-env-secret.yaml" does not exist
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f set-env-configmap.yaml
error: the path "set-env-configmap.yaml" does not exist
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f aws-secret.yaml
secret/aws-secret unchanged
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f backend-user-deployment.yaml
deployment.apps/backend-user configured
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f backend-feed-deployment.yaml
deployment.apps/backend-feed configured
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f .\env-configmap.yaml
configmap/env-config unchanged
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f .\env-secret.yaml   
secret/env-secret unchanged
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment>
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f .\backend-reverseproxy-deployment.yaml
deployment.apps/reverseproxy configured
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl expose deployment reverseproxy --type=LoadBalancer --name=reverseproxy-ep --port=8080
Error from server (AlreadyExists): services "reverseproxy-ep" already exists
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubect get services
kubect : The term 'kubect' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is 
correct and try again.
At line:1 char:1
+ kubect get services
+ ~~~~~~
    + CategoryInfo          : ObjectNotFound: (kubect:String) [], CommandNotFoundException
    + FullyQualifiedErrorId : CommandNotFoundException

PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubect get services
kubect : The term 'kubect' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is 
correct and try again.
At line:1 char:1
+ kubect get services
+ ~~~~~~
    + CategoryInfo          : ObjectNotFound: (kubect:String) [], CommandNotFoundException
    + FullyQualifiedErrorId : CommandNotFoundException

PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl get services
NAME              TYPE           CLUSTER-IP       EXTERNAL-IP                                                               PORT(S)          AGE
backend-feed      ClusterIP      172.20.205.234   <none>                                                                    8080/TCP         14h
backend-user      ClusterIP      172.20.175.56    <none>                                                                    8080/TCP         14h
frontend          ClusterIP      172.20.241.119   <none>                                                                    8100/TCP         14h
frontend-ep       LoadBalancer   172.20.165.235   a182a737e36cc42a39188efd5484497d-330640007.us-east-1.elb.amazonaws.com    80:30380/TCP     47m
frontend-ep2      LoadBalancer   172.20.236.205   ac4093e0a9bad42098f21ede1c0a5052-378288480.us-east-1.elb.amazonaws.com    80:31968/TCP     36m
frontend-ep3      LoadBalancer   172.20.23.103    aefa9798391c04762ababa035e887399-1227445994.us-east-1.elb.amazonaws.com   80:30341/TCP     30m
kubernetes        ClusterIP      172.20.0.1       <none>                                                                    443/TCP          33h
publicfrontend    LoadBalancer   172.20.208.184   a9aeb4eb1930c4500be543e0a4226191-1487978401.us-east-1.elb.amazonaws.com   80:32443/TCP     14h
publicr           LoadBalancer   172.20.120.120   a3feff7c680ff457cae7610165799167-399403798.us-east-1.elb.amazonaws.com    8080:32700/TCP   14h
reverseproxy      ClusterIP      172.20.204.178   <none>                                                                    8080/TCP         14h
reverseproxy-ep   LoadBalancer   172.20.56.223    a992a3f46d8684341be1c7acd235c565-829279486.us-east-1.elb.amazonaws.com    8080:30749/TCP   53m
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> cd ..                                                     
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> docker build . -t [Dockerhub-username]/udagram-frontend:v6^C
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> docker build . -t alannguyen23/udagram-frontend:v2        
[+] Building 0.2s (2/2) FINISHED                                                                                                                                                         docker:default
 => [internal] load .dockerignore                                                                                                                                                                  0.1s
 => => transferring context: 2B                                                                                                                                                                    0.0s 
 => [internal] load build definition from Dockerfile                                                                                                                                               0.1s 
 => => transferring dockerfile: 2B                                                                                                                                                                 0.0s
ERROR: failed to solve: failed to read dockerfile: open /var/lib/docker/tmp/buildkit-mount377620054/Dockerfile: no such file or directory
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> cd .\udagram-frontend\
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\udagram-frontend> docker build . -t alannguyen23/udagram-frontend:v2
2023/11/13 20:16:52 http2: server: error reading preface from client //./pipe/docker_engine: file has already been closed
[+] Building 6.4s (17/17) FINISHED                                                                                                                                                       docker:default
 => [internal] load build definition from Dockerfile                                                                                                                                               0.0s
 => => transferring dockerfile: 508B                                                                                                                                                               0.0s 
 => [internal] load .dockerignore                                                                                                                                                                  0.0s 
 => => transferring context: 52B                                                                                                                                                                   0.0s 
 => [internal] load metadata for docker.io/library/nginx:alpine                                                                                                                                    6.2s 
 => [internal] load metadata for docker.io/library/node:16                                                                                                                                         2.1s 
 => [auth] library/node:pull token for registry-1.docker.io                                                                                                                                        0.0s
 => [auth] library/nginx:pull token for registry-1.docker.io                                                                                                                                       0.0s
 => [stage-1 1/2] FROM docker.io/library/nginx:alpine@sha256:db353d0f0c479c91bd15e01fc68ed0f33d9c4c52f3415e63332c3d0bf7a4bb77                                                                      0.0s
 => [build 1/7] FROM docker.io/library/node:16@sha256:f77a1aef2da8d83e45ec990f45df50f1a286c5fe8bbfb8c6e4246c6389705c0b                                                                             0.0s 
 => [internal] load build context                                                                                                                                                                  0.0s 
 => => transferring context: 5.89kB                                                                                                                                                                0.0s 
 => CACHED [build 2/7] WORKDIR /usr/src/app                                                                                                                                                        0.0s
 => CACHED [build 3/7] COPY package*.json ./                                                                                                                                                       0.0s 
 => CACHED [build 4/7] RUN npm i -f                                                                                                                                                                0.0s 
 => CACHED [build 5/7] RUN npm install -g @ionic/cli                                                                                                                                               0.0s 
 => CACHED [build 6/7] COPY . .                                                                                                                                                                    0.0s 
 => CACHED [build 7/7] RUN ionic build                                                                                                                                                             0.0s 
 => CACHED [stage-1 2/2] COPY --from=build  /usr/src/app/www /usr/share/nginx/html                                                                                                                 0.0s 
 => exporting to image                                                                                                                                                                             0.0s 
 => => exporting layers                                                                                                                                                                            0.0s 
 => => writing image sha256:7e403ed982908a7999b519f2381aabdf875d2e205d1544add1f8089a1a8dcf76                                                                                                       0.0s 
 => => naming to docker.io/alannguyen23/udagram-frontend:v2                                                                                                                                        0.0s 

What's Next?
  View a summary of image vulnerabilities and recommendations → docker scout quickview
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\udagram-frontend> docker push alannguyen23/udagram-frontend:v2
The push refers to repository [docker.io/alannguyen23/udagram-frontend]
2bdd7f8e852b: Layer already exists
4b701b99fec7: Layer already exists
01e36c0e0b84: Layer already exists
901e6dddcc99: Layer already exists
f126bda54112: Layer already exists
38067ed663bf: Layer already exists
854101110f63: Layer already exists
81fdcc81a9d0: Layer already exists
cc2447e1835a: Layer already exists
v2: digest: sha256:46b975b397c100af4d108fbfd9494ef56aadb48abd094161b434a2a8652b613d size: 2200
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\udagram-frontend> cd ..                                       
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> cd .\project-deployment\
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl set image deployment frontend frontend=alannguyen23/udagram-frontend:v2
deployment.apps/frontend image updated
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl get services
NAME              TYPE           CLUSTER-IP       EXTERNAL-IP                                                               PORT(S)          AGE
backend-feed      ClusterIP      172.20.205.234   <none>                                                                    8080/TCP         14h
backend-user      ClusterIP      172.20.175.56    <none>                                                                    8080/TCP         14h
frontend          ClusterIP      172.20.241.119   <none>                                                                    8100/TCP         14h
frontend-ep       LoadBalancer   172.20.165.235   a182a737e36cc42a39188efd5484497d-330640007.us-east-1.elb.amazonaws.com    80:30380/TCP     57m
frontend-ep2      LoadBalancer   172.20.236.205   ac4093e0a9bad42098f21ede1c0a5052-378288480.us-east-1.elb.amazonaws.com    80:31968/TCP     46m
frontend-ep3      LoadBalancer   172.20.23.103    aefa9798391c04762ababa035e887399-1227445994.us-east-1.elb.amazonaws.com   80:30341/TCP     40m
kubernetes        ClusterIP      172.20.0.1       <none>                                                                    443/TCP          33h
publicfrontend    LoadBalancer   172.20.208.184   a9aeb4eb1930c4500be543e0a4226191-1487978401.us-east-1.elb.amazonaws.com   80:32443/TCP     14h
publicr           LoadBalancer   172.20.120.120   a3feff7c680ff457cae7610165799167-399403798.us-east-1.elb.amazonaws.com    8080:32700/TCP   14h
reverseproxy      ClusterIP      172.20.204.178   <none>                                                                    8080/TCP         14h
reverseproxy-ep   LoadBalancer   172.20.56.223    a992a3f46d8684341be1c7acd235c565-829279486.us-east-1.elb.amazonaws.com    8080:30749/TCP   63m
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl get pods
NAME                            READY   STATUS    RESTARTS   AGE
backend-feed-968fdc458-6mwxh    1/1     Running   0          16m
backend-feed-968fdc458-89h29    1/1     Running   0          16m
backend-feed-968fdc458-l27hc    1/1     Running   0          14m
backend-user-5584f8fc5b-pxth9   1/1     Running   0          14m
backend-user-5584f8fc5b-xnjzh   1/1     Running   0          32m
backend-user-5584f8fc5b-znwz5   1/1     Running   0          14m
frontend-9f496689b-9vb4h        1/1     Running   0          48s
frontend-9f496689b-vnvl9        1/1     Running   0          45s
reverseproxy-54dcb98ffb-9qljt   1/1     Running   0          32m
reverseproxy-54dcb98ffb-vbmm2   1/1     Running   0          32m
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> ^C
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f .\frontend-deployment.yaml  
deployment.apps/frontend configured
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl get deplpoyments
error: the server doesn't have a resource type "deplpoyments"
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl get deployments 
NAME           READY   UP-TO-DATE   AVAILABLE   AGE
backend-feed   3/3     3            3           14h
backend-user   3/3     3            3           14h
frontend       2/2     2            2           14h
reverseproxy   2/2     2            2           14h
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl describe pod frontend-9f496689b-9vb4h 
Name:             frontend-9f496689b-9vb4h
Namespace:        default
Priority:         0
Service Account:  default
Node:             ip-10-0-17-107.ec2.internal/10.0.17.107
Start Time:       Mon, 13 Nov 2023 20:19:09 +0700
Labels:           api=external
                  pod-template-hash=9f496689b
                  service=frontend
Annotations:      <none>
Status:           Running
IP:               10.0.30.233
IPs:
  IP:           10.0.30.233
Controlled By:  ReplicaSet/frontend-9f496689b
Containers:
  frontend:
    Container ID:   containerd://30cfa507050dd9bac9e9152d457fc8505c6f6706332241a52fd6672f6103b157
    Image:          alannguyen23/udagram-frontend:v2
    Image ID:       docker.io/alannguyen23/udagram-frontend@sha256:46b975b397c100af4d108fbfd9494ef56aadb48abd094161b434a2a8652b613d
    Port:           80/TCP
    Host Port:      0/TCP
    State:          Running
      Started:      Mon, 13 Nov 2023 20:19:11 +0700
    Ready:          True
    Restart Count:  0
    Limits:
      cpu:     500m
      memory:  2Gi
    Requests:
      cpu:        250m
      memory:     64Mi
    Environment:  <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-htf8n (ro)
Conditions:
  Type              Status
  Initialized       True
  Ready             True
  ContainersReady   True
  PodScheduled      True
Volumes:
  kube-api-access-htf8n:
    Type:                    Projected (a volume that contains injected data from multiple sources)
    TokenExpirationSeconds:  3607
    ConfigMapName:           kube-root-ca.crt
    ConfigMapOptional:       <nil>
QoS Class:                   Burstable
QoS Class:                   Burstable
Node-Selectors:              <none>
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type    Reason     Age    From               Message
  ----    ------     ----   ----               -------
  Normal  Scheduled  5m42s  default-scheduler  Successfully assigned default/frontend-9f496689b-9vb4h to ip-10-0-17-107.ec2.internal
  Normal  Pulling    5m42s  kubelet            Pulling image "alannguyen23/udagram-frontend:v2"
  Normal  Pulled     5m40s  kubelet            Successfully pulled image "alannguyen23/udagram-frontend:v2" in 1.556s (1.556s including waiting)
  Normal  Created    5m40s  kubelet            Created container frontend
  Normal  Started    5m40s  kubelet            Started container frontend
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
serviceaccount/metrics-server unchanged
clusterrole.rbac.authorization.k8s.io/system:aggregated-metrics-reader unchanged
clusterrole.rbac.authorization.k8s.io/system:metrics-server unchanged
rolebinding.rbac.authorization.k8s.io/metrics-server-auth-reader unchanged
clusterrolebinding.rbac.authorization.k8s.io/metrics-server:system:auth-delegator unchanged
clusterrolebinding.rbac.authorization.k8s.io/system:metrics-server unchanged
service/metrics-server unchanged
deployment.apps/metrics-server configured
apiservice.apiregistration.k8s.io/v1beta1.metrics.k8s.io unchanged
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f .\backend-feed-deployment.yaml
deployment.apps/backend-feed configured
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f .\backend-feed-service.yaml   
service/backend-feed unchanged
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f .\backend-reverseproxy-deployment.yaml
deployment.apps/reverseproxy configured
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f .\backend-user-deployment.yaml        
deployment.apps/backend-user configured
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f .\frontend-deployment.yaml    
deployment.apps/frontend configured
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl apply -f .\frontend-deployment.yaml    
deployment.apps/frontend configured
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl describe pod frontend-9f496689b-9vb4h                                                     
Name:             frontend-9f496689b-9vb4h
Namespace:        default
Priority:         0
Service Account:  default
Node:             ip-10-0-17-107.ec2.internal/10.0.17.107
Start Time:       Mon, 13 Nov 2023 20:19:09 +0700
Labels:           api=external
                  pod-template-hash=9f496689b
                  service=frontend
Annotations:      <none>
Status:           Running
IP:               10.0.30.233
IPs:
  IP:           10.0.30.233
Controlled By:  ReplicaSet/frontend-9f496689b
Containers:
  frontend:
    Container ID:   containerd://30cfa507050dd9bac9e9152d457fc8505c6f6706332241a52fd6672f6103b157
    Image:          alannguyen23/udagram-frontend:v2
    Image ID:       docker.io/alannguyen23/udagram-frontend@sha256:46b975b397c100af4d108fbfd9494ef56aadb48abd094161b434a2a8652b613d
    Port:           80/TCP
    Host Port:      0/TCP
    State:          Running
      Started:      Mon, 13 Nov 2023 20:19:11 +0700
    Ready:          True
    Restart Count:  0
    Limits:
      cpu:     500m
      memory:  2Gi
    Requests:
      cpu:        250m
      memory:     64Mi
    Environment:  <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-htf8n (ro)
Conditions:
  Type              Status
  Initialized       True
  Ready             True
  ContainersReady   True
  PodScheduled      True
Volumes:
  kube-api-access-htf8n:
    Type:                    Projected (a volume that contains injected data from multiple sources)
    TokenExpirationSeconds:  3607
    ConfigMapName:           kube-root-ca.crt
    ConfigMapOptional:       <nil>
    DownwardAPI:             true
QoS Class:                   Burstable
Node-Selectors:              <none>
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  18m   default-scheduler  Successfully assigned default/frontend-9f496689b-9vb4h to ip-10-0-17-107.ec2.internal
  Normal  Pulling    18m   kubelet            Pulling image "alannguyen23/udagram-frontend:v2"
  Normal  Pulled     18m   kubelet            Successfully pulled image "alannguyen23/udagram-frontend:v2" in 1.556s (1.556s including waiting)
  Normal  Created    18m   kubelet            Created container frontend
  Normal  Started    18m   kubelet            Started container frontend
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl get deployments
NAME           READY   UP-TO-DATE   AVAILABLE   AGE
backend-feed   3/3     3            3           15h
backend-user   3/3     3            3           15h
frontend       2/2     2            2           15h
reverseproxy   2/2     2            2           15h
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl expose deployment frontend --type=LoadBalancer --name=publicfrontend2
service/publicfrontend2 exposed
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl get deployments                                                                           
NAME           READY   UP-TO-DATE   AVAILABLE   AGE
backend-feed   3/3     3            3           15h
backend-user   3/3     3            3           15h
frontend       2/2     2            2           15h
reverseproxy   2/2     2            2           15h
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl get services                                                                              
NAME              TYPE           CLUSTER-IP       EXTERNAL-IP                                                               PORT(S)          AGE
backend-feed      ClusterIP      172.20.205.234   <none>                                                                    8080/TCP         15h
backend-user      ClusterIP      172.20.175.56    <none>                                                                    8080/TCP         15h
frontend          ClusterIP      172.20.241.119   <none>                                                                    8100/TCP         15h
frontend-ep       LoadBalancer   172.20.165.235   a182a737e36cc42a39188efd5484497d-330640007.us-east-1.elb.amazonaws.com    80:30380/TCP     79m
frontend-ep2      LoadBalancer   172.20.236.205   ac4093e0a9bad42098f21ede1c0a5052-378288480.us-east-1.elb.amazonaws.com    80:31968/TCP     67m
frontend-ep3      LoadBalancer   172.20.23.103    aefa9798391c04762ababa035e887399-1227445994.us-east-1.elb.amazonaws.com   80:30341/TCP     61m
kubernetes        ClusterIP      172.20.0.1       <none>                                                                    443/TCP          33h
publicfrontend    LoadBalancer   172.20.208.184   a9aeb4eb1930c4500be543e0a4226191-1487978401.us-east-1.elb.amazonaws.com   80:32443/TCP     15h
publicfrontend2   LoadBalancer   172.20.141.42    a683232c383b1413ba6a734a428698d2-389110302.us-east-1.elb.amazonaws.com    80:30270/TCP     37s
publicr           LoadBalancer   172.20.120.120   a3feff7c680ff457cae7610165799167-399403798.us-east-1.elb.amazonaws.com    8080:32700/TCP   14h
reverseproxy      ClusterIP      172.20.204.178   <none>                                                                    8080/TCP         15h
reverseproxy-ep   LoadBalancer   172.20.56.223    a992a3f46d8684341be1c7acd235c565-829279486.us-east-1.elb.amazonaws.com    8080:30749/TCP   85m
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl get pods
NAME                            READY   STATUS    RESTARTS   AGE
backend-feed-968fdc458-52w2q    1/1     Running   0          13m
backend-feed-968fdc458-89h29    1/1     Running   0          40m
backend-feed-968fdc458-l27hc    1/1     Running   0          38m
backend-user-5584f8fc5b-pxth9   1/1     Running   0          38m
backend-user-5584f8fc5b-zbpkc   1/1     Running   0          12m
backend-user-5584f8fc5b-znwz5   1/1     Running   0          38m
frontend-9f496689b-9vb4h        1/1     Running   0          24m
frontend-9f496689b-vnvl9        1/1     Running   0          24m
reverseproxy-54dcb98ffb-9qljt   1/1     Running   0          56m
reverseproxy-54dcb98ffb-vbmm2   1/1     Running   0          56m
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kibectl logs backend-feed-968fdc458-52w2q 
kibectl : The term 'kibectl' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is 
correct and try again.
At line:1 char:1
+ kibectl logs backend-feed-968fdc458-52w2q
+ ~~~~~~~
    + CategoryInfo          : ObjectNotFound: (kibectl:String) [], CommandNotFoundException
    + FullyQualifiedErrorId : CommandNotFoundException

PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl logs backend-feed-968fdc458-52w2q 

> udagram-api@2.0.0 prod
> tsc && node ./www/server.js

db02.ct07kuwzblwb.us-east-1.rds.amazonaws.com
Initialize database connection...
(node:26) NOTE: We are formalizing our plans to enter AWS SDK for JavaScript (v2) into maintenance mode in 2023.

Please migrate your code to use AWS SDK for JavaScript (v3).
For more information, check the migration guide at https://a.co/7PzMCcy
(Use `node --trace-warnings ...` to show where the warning was created)
Executing (default): CREATE TABLE IF NOT EXISTS "FeedItem" ("id"   SERIAL , "caption" VARCHAR(255), "url" VARCHAR(255), "createdAt" TIMESTAMP WITH TIME ZONE, "updatedAt" TIMESTAMP WITH TIME ZONE, PRIMARY KEY ("id"));
Executing (default): SELECT i.relname AS name, ix.indisprimary AS primary, ix.indisunique AS unique, ix.indkey AS indkey, array_agg(a.attnum) as column_indexes, array_agg(a.attname) AS column_names, pg_get_indexdef(ix.indexrelid) AS definition FROM pg_class t, pg_class i, pg_index ix, pg_attribute a WHERE t.oid = ix.indrelid AND i.oid = ix.indexrelid AND a.attrelid = t.oid AND t.relkind = 'r' and t.relname = 'FeedItem' GROUP BY i.relname, ix.indexrelid, ix.indisprimary, ix.indisunique, ix.indkey ORDER BY i.relname;
server running http://localhost:8100
press CTRL+C to stop server
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl logs backend-feed-968fdc458-89h29  

> udagram-api@2.0.0 prod
> tsc && node ./www/server.js

db02.ct07kuwzblwb.us-east-1.rds.amazonaws.com
Initialize database connection...
(node:26) NOTE: We are formalizing our plans to enter AWS SDK for JavaScript (v2) into maintenance mode in 2023.

Please migrate your code to use AWS SDK for JavaScript (v3).
For more information, check the migration guide at https://a.co/7PzMCcy
(Use `node --trace-warnings ...` to show where the warning was created)
Executing (default): CREATE TABLE IF NOT EXISTS "FeedItem" ("id"   SERIAL , "caption" VARCHAR(255), "url" VARCHAR(255), "createdAt" TIMESTAMP WITH TIME ZONE, "updatedAt" TIMESTAMP WITH TIME ZONE, PRIMARY KEY ("id"));
Executing (default): SELECT i.relname AS name, ix.indisprimary AS primary, ix.indisunique AS unique, ix.indkey AS indkey, array_agg(a.attnum) as column_indexes, array_agg(a.attname) AS column_names, pg_get_indexdef(ix.indexrelid) AS definition FROM pg_class t, pg_class i, pg_index ix, pg_attribute a WHERE t.oid = ix.indrelid AND i.oid = ix.indexrelid AND a.attrelid = t.oid AND t.relkind = 'r' and t.relname = 'FeedItem' GROUP BY i.relname, ix.indexrelid, ix.indisprimary, ix.indisunique, ix.indkey ORDER BY i.relname;
server running http://localhost:8100
press CTRL+C to stop server
Executing (default): SELECT count(*) AS "count" FROM "FeedItem" AS "FeedItem";
Executing (default): SELECT "id", "caption", "url", "createdAt", "updatedAt" FROM "FeedItem" AS "FeedItem" ORDER BY "FeedItem"."id" DESC;
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl logs backend-feed-968fdc458-l27hc 

> udagram-api@2.0.0 prod
> tsc && node ./www/server.js

db02.ct07kuwzblwb.us-east-1.rds.amazonaws.com
Initialize database connection...
(node:26) NOTE: We are formalizing our plans to enter AWS SDK for JavaScript (v2) into maintenance mode in 2023.

Please migrate your code to use AWS SDK for JavaScript (v3).
For more information, check the migration guide at https://a.co/7PzMCcy
(Use `node --trace-warnings ...` to show where the warning was created)
Executing (default): CREATE TABLE IF NOT EXISTS "FeedItem" ("id"   SERIAL , "caption" VARCHAR(255), "url" VARCHAR(255), "createdAt" TIMESTAMP WITH TIME ZONE, "updatedAt" TIMESTAMP WITH TIME ZONE, PRIMARY KEY ("id"));
Executing (default): SELECT i.relname AS name, ix.indisprimary AS primary, ix.indisunique AS unique, ix.indkey AS indkey, array_agg(a.attnum) as column_indexes, array_agg(a.attname) AS column_names, pg_get_indexdef(ix.indexrelid) AS definition FROM pg_class t, pg_class i, pg_index ix, pg_attribute a WHERE t.oid = ix.indrelid AND i.oid = ix.indexrelid AND a.attrelid = t.oid AND t.relkind = 'r' and t.relname = 'FeedItem' GROUP BY i.relname, ix.indexrelid, ix.indisprimary, ix.indisunique, ix.indkey ORDER BY i.relname;
server running http://localhost:8100
press CTRL+C to stop server
Executing (default): SELECT count(*) AS "count" FROM "FeedItem" AS "FeedItem";
Executing (default): SELECT "id", "caption", "url", "createdAt", "updatedAt" FROM "FeedItem" AS "FeedItem" ORDER BY "FeedItem"."id" DESC;
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl logs backend-user-5584f8fc5b-znwz5 

> udagram-api@2.0.0 prod
> tsc && node ./www/server.js

db02.ct07kuwzblwb.us-east-1.rds.amazonaws.com
Initialize database connection...
Executing (default): CREATE TABLE IF NOT EXISTS "User" ("email" VARCHAR(255) , "passwordHash" VARCHAR(255), "createdAt" TIMESTAMP WITH TIME ZONE, "updatedAt" TIMESTAMP WITH TIME ZONE, PRIMARY KEY ("email"));
Executing (default): SELECT i.relname AS name, ix.indisprimary AS primary, ix.indisunique AS unique, ix.indkey AS indkey, array_agg(a.attnum) as column_indexes, array_agg(a.attname) AS column_names, pg_get_indexdef(ix.indexrelid) AS definition FROM pg_class t, pg_class i, pg_index ix, pg_attribute a WHERE t.oid = ix.indrelid AND i.oid = ix.indexrelid AND a.attrelid = t.oid AND t.relkind = 'r' and t.relname = 'User' GROUP BY i.relname, ix.indexrelid, ix.indisprimary, ix.indisunique, ix.indkey ORDER BY i.relname;
server running http://localhost:8100
press CTRL+C to stop server
Executing (default): SELECT "email", "passwordHash", "createdAt", "updatedAt" FROM "User" AS "User" WHERE "User"."email" = 'zxczc@gmail.com';
Executing (default): SELECT "email", "passwordHash", "createdAt", "updatedAt" FROM "User" AS "User" WHERE "User"."email" = 'zxczc@gmail.com';
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> kubectl logs frontend-9f496689b-9vb4h      
/docker-entrypoint.sh: /docker-entrypoint.d/ is not empty, will attempt to perform configuration
/docker-entrypoint.sh: Looking for shell scripts in /docker-entrypoint.d/
/docker-entrypoint.sh: Launching /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh
10-listen-on-ipv6-by-default.sh: info: Getting the checksum of /etc/nginx/conf.d/default.conf
10-listen-on-ipv6-by-default.sh: info: Enabled listen on IPv6 in /etc/nginx/conf.d/default.conf
/docker-entrypoint.sh: Sourcing /docker-entrypoint.d/15-local-resolvers.envsh
/docker-entrypoint.sh: Launching /docker-entrypoint.d/20-envsubst-on-templates.sh
/docker-entrypoint.sh: Launching /docker-entrypoint.d/30-tune-worker-processes.sh
/docker-entrypoint.sh: Configuration complete; ready for start up
2023/11/13 13:19:11 [notice] 1#1: using the "epoll" event method
2023/11/13 13:19:11 [notice] 1#1: nginx/1.25.3
2023/11/13 13:19:11 [notice] 1#1: built by gcc 12.2.1 20220924 (Alpine 12.2.1_git20220924-r10)
2023/11/13 13:19:11 [notice] 1#1: OS: Linux 5.10.198-187.748.amzn2.x86_64
2023/11/13 13:19:11 [notice] 1#1: getrlimit(RLIMIT_NOFILE): 1048576:1048576
2023/11/13 13:19:11 [notice] 1#1: start worker processes
2023/11/13 13:19:11 [notice] 1#1: start worker process 30
2023/11/13 13:19:11 [notice] 1#1: start worker process 31
2023/11/13 13:23:06 [error] 30#30: *82 open() "/usr/share/nginx/html/home" failed (2: No such file or directory), client: 10.0.17.107, server: localhost, request: "GET /home HTTP/1.1", host: "a9aeb4eb1930c4500be543e0a4226191-1487978401.us-east-1.elb.amazonaws.com"
10.0.17.107 - - [13/Nov/2023:13:23:06 +0000] "GET /home HTTP/1.1" 404 555 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0" "-"
10.0.17.107 - - [13/Nov/2023:13:23:12 +0000] "GET /assets/icon/favicon.png HTTP/1.1" 200 930 "http://a9aeb4eb1930c4500be543e0a4226191-1487978401.us-east-1.elb.amazonaws.com/home" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0" "-"
2023/11/13 13:23:15 [error] 30#30: *82 open() "/usr/share/nginx/html/home" failed (2: No such file or directory), client: 10.0.17.107, server: localhost, request: "GET /home HTTP/1.1", host: "a9aeb4eb1930c4500be543e0a4226191-1487978401.us-east-1.elb.amazonaws.com"
10.0.17.107 - - [13/Nov/2023:13:23:15 +0000] "GET /home HTTP/1.1" 404 555 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0" "-"
2023/11/13 13:27:14 [error] 31#31: *184 open() "/usr/share/nginx/html/Temporary_Listen_Addresses" failed (2: No such file or directory), client: 10.0.17.107, server: localhost, request: "GET /Temporary_Listen_Addresses HTTP/1.1", host: "54.204.101.116"
10.0.17.107 - - [13/Nov/2023:13:27:14 +0000] "GET /Temporary_Listen_Addresses HTTP/1.1" 404 153 "-" "Mozilla/5.0 zgrab/0.x" "-"
10.0.5.125 - - [13/Nov/2023:13:31:44 +0000] "GET /42.js HTTP/1.1" 200 17197 "http://a182a737e36cc42a39188efd5484497d-330640007.us-east-1.elb.amazonaws.com/home" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0" "-"
10.0.5.125 - - [13/Nov/2023:13:31:44 +0000] "GET /32.js HTTP/1.1" 200 16122 "http://a182a737e36cc42a39188efd5484497d-330640007.us-east-1.elb.amazonaws.com/home" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0" "-"
10.0.5.125 - - [13/Nov/2023:13:31:45 +0000] "GET /index-69c37885-js.js HTTP/1.1" 200 42920 "http://a182a737e36cc42a39188efd5484497d-330640007.us-east-1.elb.amazonaws.com/home" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0" "-"
10.0.17.107 - - [13/Nov/2023:13:35:31 +0000] "GET / HTTP/1.1" 200 952 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:102.0) Gecko/20100101 Firefox/102.0" "-"
2023/11/13 13:37:50 [error] 31#31: *440 "/usr/share/nginx/html/geoserver/web/index.html" is not found (2: No such file or directory), client: 10.0.17.107, server: localhost, request: "GET /geoserver/web/ HTTP/1.1", host: "54.224.18.220"
10.0.17.107 - - [13/Nov/2023:13:37:50 +0000] "GET /geoserver/web/ HTTP/1.1" 404 153 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:102.0) Gecko/20100101 Firefox/102.0" "-"
10.0.5.125 - - [13/Nov/2023:13:40:09 +0000] "GET / HTTP/1.1" 200 952 "-" "-" "-"
10.0.5.125 - - [13/Nov/2023:13:41:54 +0000] "GET /vendor.js HTTP/1.1" 200 4881602 "http://a683232c383b1413ba6a734a428698d2-389110302.us-east-1.elb.amazonaws.com/" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0" "-"
10.0.5.125 - - [13/Nov/2023:13:42:04 +0000] "GET /0.js HTTP/1.1" 200 15802 "http://a683232c383b1413ba6a734a428698d2-389110302.us-east-1.elb.amazonaws.com/" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0" "-"
10.0.5.125 - - [13/Nov/2023:13:42:05 +0000] "GET /8.js HTTP/1.1" 200 70736 "http://a683232c383b1413ba6a734a428698d2-389110302.us-east-1.elb.amazonaws.com/" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0" "-"
10.0.5.125 - - [13/Nov/2023:13:42:05 +0000] "GET /36.js HTTP/1.1" 200 47534 "http://a683232c383b1413ba6a734a428698d2-389110302.us-east-1.elb.amazonaws.com/" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0" "-"
10.0.5.125 - - [13/Nov/2023:13:42:05 +0000] "GET /40.js HTTP/1.1" 200 41488 "http://a683232c383b1413ba6a734a428698d2-389110302.us-east-1.elb.amazonaws.com/" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0" "-"
10.0.5.125 - - [13/Nov/2023:13:42:05 +0000] "GET /home-home-module.js HTTP/1.1" 200 36492 "http://a683232c383b1413ba6a734a428698d2-389110302.us-east-1.elb.amazonaws.com/" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0" "-"
10.0.5.125 - - [13/Nov/2023:13:42:05 +0000] "GET /svg/md-home.svg HTTP/1.1" 200 136 "http://a683232c383b1413ba6a734a428698d2-389110302.us-east-1.elb.amazonaws.com/home" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0" "-"
10.0.5.125 - - [13/Nov/2023:13:42:05 +0000] "GET /56.js HTTP/1.1" 200 8070 "http://a683232c383b1413ba6a734a428698d2-389110302.us-east-1.elb.amazonaws.com/home" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0" "-"
10.0.5.125 - - [13/Nov/2023:13:42:06 +0000] "GET /tap-click-ca00ce7f-js.js HTTP/1.1" 200 6469 "http://a683232c383b1413ba6a734a428698d2-389110302.us-east-1.elb.amazonaws.com/home" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0" "-"
10.0.5.125 - - [13/Nov/2023:13:42:06 +0000] "GET /28.js HTTP/1.1" 200 4194 "http://a683232c383b1413ba6a734a428698d2-389110302.us-east-1.elb.amazonaws.com/home" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0" "-"
10.0.5.125 - - [13/Nov/2023:13:42:50 +0000] "GET / HTTP/1.1" 200 952 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0" "-"
2023/11/13 13:46:07 [error] 31#31: *666 open() "/usr/share/nginx/html/Temporary_Listen_Addresses" failed (2: No such file or directory), client: 10.0.17.107, server: localhost, request: "GET /Temporary_Listen_Addresses HTTP/1.1", host: "54.225.116.148"
10.0.17.107 - - [13/Nov/2023:13:46:07 +0000] "GET /Temporary_Listen_Addresses HTTP/1.1" 404 153 "-" "Mozilla/5.0 zgrab/0.x" "-"
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> git add .
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project\project-deployment> cd ..
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> git add .
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> git status
On branch main
Your branch is up to date with 'origin/main'.

Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        modified:   project-deployment/frontend-deployment.yaml
        modified:   screenshots/kubectl logs 1.png
        modified:   screenshots/kubectl logs 2.png

PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> git add .
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> git commit -m "update deployemt frontend add tag v2"
[main 57bb7b6] update deployemt frontend add tag v2
 3 files changed, 1 insertion(+), 1 deletion(-)
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> git push 
Enumerating objects: 13, done.
Counting objects: 100% (13/13), done.
Delta compression using up to 16 threads
Compressing objects: 100% (7/7), done.
Writing objects: 100% (7/7), 166.16 KiB | 23.74 MiB/s, done.
Total 7 (delta 4), reused 0 (delta 0), pack-reused 0
remote: Resolving deltas: 100% (4/4), completed with 4 local objects.
To https://github.com/quang-vn26/Udacity-Cloud-Developer-project-3.git
   c576b7f..57bb7b6  main -> main
PS C:\Users\QuangG\Desktop\AWS\Peoject 3\cd0354-monolith-to-microservices-project> kubectl describe pod frontend-9f496689b-9vb4h
```


