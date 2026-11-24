# Hướng Dẫn Thiết Lập AWS & GitHub Actions CI/CD (Mô Hình 1)

Tài liệu này hướng dẫn các thao tác trên **AWS Console** và **GitHub Settings** để vận hành pipeline tự động `.github/workflows/deploy.yaml`:
- **Frontend (React + Vite)**: Build tĩnh → Đồng bộ **Amazon S3** → Xóa cache **Amazon CloudFront** (`https://d1tfb39o1ucbfq.cloudfront.net`).
- **Backend (Spring Boot 3 + Java 21)**: Build Docker Image → Đẩy lên **Amazon ECR** → Rolling update **Amazon ECS Fargate** (kết nối nội bộ tới **Amazon RDS Private Subnet**).

---

## 1. Cấu Hình Lưu Trữ Biến Nhạy Cảm (AWS Systems Manager Parameter Store)

Vào **AWS Console → Systems Manager → Parameter Store** (Region `ap-southeast-1`), bấm **Create parameter** (chọn Type = `SecureString`) cho 5 tham số sau:

| Name | Giá trị |
| :--- | :--- |
| `/project-f/prod/DB_PASSWORD` | Mật khẩu RDS PostgreSQL |
| `/project-f/prod/SUPABASE_SERVICE_ROLE_KEY` | Service Role Key của Supabase |
| `/project-f/prod/SPRING_MAIL_USERNAME` | IAM SMTP Username của Amazon SES |
| `/project-f/prod/SPRING_MAIL_PASSWORD` | IAM SMTP Password của Amazon SES |
| `/project-f/prod/GEMINI_API_KEY` | API Key của Google Gemini |

---

## 2. Cấu Hình IAM Roles Cho ECS Fargate

Vào **AWS Console → IAM → Roles**:

1. **`ecsTaskExecutionRole`** (Role để ECS kéo image từ ECR & đọc Parameter Store):
   - Nếu chưa có: Tạo Role với Trusted entity = `Elastic Container Service` → `Elastic Container Service Task`.
   - Gắn policy có sẵn: `AmazonECSTaskExecutionRolePolicy` và `AmazonSSMReadOnlyAccess`.
2. **`project-f-ecs-task-role`** (Role cấp quyền cho code Spring Boot gọi S3 mà không cần Access Key):
   - Tạo Role với Trusted entity = `Elastic Container Service` → `Elastic Container Service Task`, đặt tên `project-f-ecs-task-role`.
   - Bấm **Add permissions → Create inline policy → JSON**, dán nội dung file [`iam-ecs-task-s3-policy.json`](./iam-ecs-task-s3-policy.json) và lưu lại.

---

## 3. Tạo Amazon ECR Repository

1. Vào **Amazon ECR → Repositories → Create repository** (Region `ap-southeast-1`).
2. Chọn **Private**, đặt **Repository name**: `project-f-backend` → bấm **Create**.
3. *(Tùy chọn cho lần đầu tiên trước khi chạy GitHub Actions)*: Bạn có thể bấm **View push commands** trên ECR để đẩy thử 1 image đầu tiên lên repo này, hoặc để GitHub Actions tự đẩy.

---

## 4. Tạo ECS Cluster, Task Definition & Fargate Service

### 4.1. Security Groups (VPC)
1. Tạo Security Group **`project-f-alb-sg`** (nếu dùng Application Load Balancer):
   - Inbound: mở cổng `80` (HTTP) từ `0.0.0.0/0` (hoặc prefix list của CloudFront).
2. Tạo Security Group **`project-f-ecs-sg`** (gắn cho ECS Fargate Task):
   - Inbound: mở cổng `8080` (TCP) từ **`project-f-alb-sg`** (hoặc `0.0.0.0/0` nếu test trực tiếp không qua ALB).
3. Mở cổng Database trên Security Group của **RDS (`project-f-database-1`)**:
   - Vào **EC2 → Security Groups** → chọn Security Group của RDS → **Edit inbound rules** → Thêm rule:
     - **Type**: `PostgreSQL` (Port `5432`)
     - **Source**: chọn Security Group **`project-f-ecs-sg`**.

### 4.2. Tạo ECS Cluster & Task Definition
1. Vào **Amazon ECS → Clusters → Create cluster**:
   - **Cluster name**: `project-f-cluster`
   - **Infrastructure**: chọn **AWS Fargate (serverless)** → bấm **Create**.
2. Vào **Task definitions → Create new task definition → Create new task definition with JSON**:
   - Copy nội dung từ [`ecs-task-definition.template.json`](./ecs-task-definition.template.json), thay `<AWS_ACCOUNT_ID>` bằng Account ID 12 chữ số của bạn → bấm **Create**.

### 4.3. Tạo Application Load Balancer (ALB) & ECS Service
1. Trong **Amazon ECS → Clusters → `project-f-cluster` → Create service**:
   - **Compute options**: Launch type → `FARGATE`.
   - **Task definition**: Family `project-f-backend-task`, Revision mới nhất.
   - **Service name**: `project-f-backend-service`, Desired tasks = `1`.
   - **Networking**:
     - Chọn đúng **VPC** chứa RDS (`10.0.0.0/16`).
     - Chọn **Public Subnets** (tối thiểu 2 AZ để gắn ALB) và bật **Public IP = Turned on** *(nếu đặt trong Private Subnet thì cần có NAT Gateway để gọi ra Supabase/SES/ECR)*.
     - **Security group**: chọn `project-f-ecs-sg`.
   - **Load balancing** (Khuyến nghị để có DNS cố định nối vào CloudFront):
     - Chọn **Application Load Balancer** → **Create a new load balancer** (`project-f-alb`, cổng `80`, Security group `project-f-alb-sg`).
     - **Target group**: `project-f-backend-tg`, Protocol `HTTP`, Port `8080`, **Health check path**: `/api/v3/api-docs`, Health check grace period: `90` giây.

---

## 5. Cấu Hình S3 & CloudFront (`d1tfb39o1ucbfq.cloudfront.net`) Cho Frontend + API

1. **Error Pages cho React Router:**
   - Vào **CloudFront → Distributions → chọn `d1tfb39o1ucbfq.cloudfront.net` → tab Error pages → Create custom error response**:
   - Tạo 2 bản ghi cho HTTP error code **`403`** và **`404`** → bật **Customize error response = Yes**, **Response page path** = `/index.html`, **HTTP Response Code** = `200`.
2. **Nối `/api/*` về ALB của ECS Backend:**
   - Tab **Origins → Create origin**:
     - **Origin domain**: chọn ALB `project-f-alb` vừa tạo.
     - **Protocol**: `HTTP only` (Port `80`).
   - Tab **Behaviors → Create behavior**:
     - **Path pattern**: `/api/*`
     - **Origin**: chọn Origin ALB vừa tạo.
     - **Viewer protocol policy**: `Redirect HTTP to HTTPS`.
     - **Allowed HTTP methods**: `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE`.
     - **Cache policy**: `CachingDisabled`.
     - **Origin request policy**: `AllViewerExceptHostHeader`.
3. **S3 CORS cho bucket lưu file media (`project-f-fcode`):**
   - Đảm bảo `AllowedOrigins` trong CORS của bucket `project-f-fcode` có `https://d1tfb39o1ucbfq.cloudfront.net`.

---

## 6. Cấu Hình GitHub Variables & Secrets

Vào repo GitHub `kazetani-SE/Project-F` → **Settings → Secrets and variables → Actions**:

### Tab **Variables** (`Repository variables` — bấm *New repository variable*):
| Variable Name | Giá trị mẫu |
| :--- | :--- |
| `AWS_REGION` | `ap-southeast-1` |
| `S3_FRONTEND_BUCKET` | `<tên-bucket-s3-chứa-frontend-của-bạn>` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `<ID-của-distribution-d1tfb39o1ucbfq>` (ví dụ `E1A2B3C4D5E6F7`) |
| `ECR_BACKEND_REPOSITORY` | `project-f-backend` |
| `ECS_CLUSTER` | `project-f-cluster` |
| `ECS_SERVICE` | `project-f-backend-service` |
| `ECS_TASK_DEFINITION_FAMILY` | `project-f-backend-task` |
| `ECS_CONTAINER_NAME` | `backend` |
| `VITE_API_BASE_URL` | `/api/v1` |

### Tab **Secrets** (`Repository secrets` — bấm *New repository secret*):
*(Tạo 1 IAM User hoặc OIDC Role trên AWS gắn policy mẫu [`iam-github-actions-deploy-policy.json`](./iam-github-actions-deploy-policy.json))*
| Secret Name | Giá trị |
| :--- | :--- |
| `AWS_ACCESS_KEY_ID` | Access Key của IAM User CI/CD *(bỏ trống nếu dùng `AWS_ROLE_ARN` OIDC)* |
| `AWS_SECRET_ACCESS_KEY` | Secret Key của IAM User CI/CD *(bỏ trống nếu dùng `AWS_ROLE_ARN` OIDC)* |
| `VITE_SUPABASE_URL` | `https://hzebpnrdxueruxmhzplq.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key của Supabase |
