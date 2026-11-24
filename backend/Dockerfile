# ============================================================================
# Stage 1: Build Spring Boot executable JAR with Maven Wrapper & JDK 21
# ============================================================================
FROM eclipse-temurin:21-jdk-alpine AS build

WORKDIR /workspace

# Copy Maven wrapper and POM first for dependency layer caching
COPY mvnw pom.xml ./
COPY .mvn .mvn

RUN sed -i 's/\r$//' mvnw && chmod +x mvnw \
    && ./mvnw dependency:go-offline -B

# Copy source code and build the application JAR
COPY pmd-ruleset.xml ./
COPY src src

RUN ./mvnw package -DskipTests -B \
    && cp target/*.jar /workspace/app.jar

# ============================================================================
# Stage 2: Lightweight JRE 21 runtime image
# ============================================================================
FROM eclipse-temurin:21-jre-alpine AS runtime

RUN apk add --no-cache curl \
    && addgroup -S app \
    && adduser -S app -G app

WORKDIR /app

COPY --from=build --chown=app:app /workspace/app.jar /app/app.jar

USER app

ENV PORT=8080 \
    JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -fsS http://localhost:8080/api/v3/api-docs > /dev/null || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
