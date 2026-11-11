# Docker, Dockerfile, image và Docker Compose

## Hiểu nhanh

- **Docker** là nền tảng để đóng gói và chạy ứng dụng trong các môi trường cô lập gọi là container. Nó giúp ứng dụng có môi trường chạy nhất quán giữa máy cá nhân, máy kiểm thử và máy chủ.
- **Dockerfile** là bản hướng dẫn để Docker tạo một image. Nó mô tả image nền, thư mục làm việc, dependency, mã nguồn và lệnh chạy ứng dụng.
- **Docker image** là gói đã được tạo theo Dockerfile. Image là khuôn mẫu chỉ đọc; có thể dùng cùng một image để khởi chạy nhiều container.
- **Container** là một tiến trình/instance ứng dụng đang chạy từ image. Dừng hoặc xóa container không nhất thiết làm mất dữ liệu lưu ở volume.
- **Docker Compose** là công cụ khai báo và quản lý nhiều service/container cùng lúc trong file `docker-compose.yml`, bao gồm cách build, cổng, biến môi trường, volume và quan hệ phụ thuộc.

Có thể hình dung:

```text
Dockerfile --docker build--> Docker image --docker run--> Container
                                      \
                                       Docker Compose điều phối nhiều container
```

## Các khái niệm được dùng trong project này

### Dockerfile

File [Dockerfile](./Dockerfile) tạo image cho Node.js API:

- `FROM node:22-alpine`: dùng Node.js 22 trên Alpine làm image nền.
- `WORKDIR /app`: đặt thư mục làm việc trong image/container.
- `COPY package.json package-lock.json ./` và `RUN npm ci --omit=dev`: cài dependency production.
- `COPY --chown=node:node src ./src`: chép mã nguồn vào image và đặt quyền cho user `node`.
- `USER node`: chạy ứng dụng bằng user không phải root.
- `EXPOSE 3000`: ghi chú rằng ứng dụng sử dụng cổng 3000 bên trong container; dòng này tự nó không mở cổng ra máy host.
- `CMD ["npm", "start"]`: lệnh mặc định để chạy API khi khởi tạo container.

### Docker image

Compose service `app` có `build: .`, nghĩa là Compose dùng thư mục project hiện tại làm build context và tìm Dockerfile để tạo image cho API. Image này chứa Node.js, dependency production và mã nguồn được chép vào ở thời điểm build.

Tạo image bằng lệnh:

```powershell
docker compose build app
```

Khi mã nguồn thay đổi, cần build lại image rồi tạo lại container để ứng dụng chạy mã mới:

```powershell
docker compose up -d --build app
```

### Docker Compose

File [docker-compose.yml](./docker-compose.yml) khai báo các service của project:

| Service | Chức năng | Cổng trên máy host |
|---|---|---:|
| `app` | Node.js Task API | `3000` |
| `app-second` | Instance thứ hai của cùng API image | `3001` |
| `mongo` | MongoDB lưu dữ liệu | `27017` |
| `mongo-express` | Giao diện quản trị MongoDB | `8081` |
| `wiremock` | Mock các HTTP API | `8080` |

Một số thiết lập đáng chú ý:

- `ports: ["3001:3000"]` có dạng `cổng-máy-host:cổng-container`. Vì vậy có thể mở instance thứ hai ở `http://localhost:3001`, dù cả hai app đều nghe cổng `3000` bên trong các container riêng biệt.
- `MONGO_URL: mongodb://mongo:27017/tasktracker` dùng tên service `mongo` làm hostname. Các container trong Compose có thể tìm nhau bằng tên service; từ Windows host thì thường kết nối MongoDB qua `localhost:27017`.
- `depends_on` với điều kiện `service_healthy` giúp app chờ MongoDB vượt qua health check trước khi được khởi động.
- `mongo-data:/data/db` là named volume để dữ liệu MongoDB tồn tại qua lần thay container.
- `./src/mock/wiremock:/home/wiremock` mount thư mục WireMock từ máy host vào container. Mapping đặt tại `src/mock/wiremock/mappings`; thay đổi file trong thư mục được mount có thể được WireMock đọc mà không cần build lại image.

Khởi động các service:

```powershell
docker compose up -d
```

Xem trạng thái và log:

```powershell
docker compose ps
docker compose logs -f app
```

Dừng các container:

```powershell
docker compose down
```

`docker compose down` không xóa named volume `mongo-data` theo mặc định. Vì vậy dữ liệu MongoDB vẫn còn để lần sau dùng tiếp.
