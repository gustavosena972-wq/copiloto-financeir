plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "br.com.copiloto.financeiro"
    compileSdk = 36

    defaultConfig {
        // PROVISÓRIO: confirmar o applicationId com o titular adulto do Play Console
        // antes de criar o app na loja. O ID publicado não deve ser alterado depois.
        applicationId = "br.com.copiloto.financeiro"
        minSdk = 23
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"

        buildConfigField(
            "String",
            "WEB_APP_URL",
            "\"https://gustavosena972-wq.github.io/copiloto-financeir/\""
        )
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
}

dependencies {
    implementation("com.android.billingclient:billing:9.1.0")
}
