# ─── Build stage ─────────────────────────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-17-alpine AS builder
WORKDIR /app
# Cache dependency layer (only re-downloads when pom.xml changes)
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

# ─── Run stage ───────────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/cipherquest-backend-0.0.1-SNAPSHOT.jar app.jar

ENV PORT=8080
EXPOSE 8080

# JVM flags optimised for a low-memory container (Render free = 512 MB):
#   -XX:+UseContainerSupport        – respect cgroup memory limits
#   -XX:MaxRAMPercentage=75.0       – cap heap at 75 % of container RAM
#   -XX:+TieredCompilation          – faster startup via tiered JIT
#   -XX:TieredStopAtLevel=1         – stay at C1 (interpreted + fast JIT) 
#                                     for a much quicker cold start on free tier
#   -Djava.security.egd=...         – faster SecureRandom (avoids /dev/random block)
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-XX:+TieredCompilation", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-Dserver.port=${PORT}", \
  "-jar", "app.jar"]
