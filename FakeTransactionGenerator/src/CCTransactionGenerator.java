import java.io.FileWriter;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Random;

public class CCTransactionGenerator {

    public static void main(String[] args) {

        // How many transactions to generate
        int numTransactions = 1000;

        // Merchant + location lists
        String[] merchants = {"Walmart", "Amazon", "Target", "BestBuy", "GasStation"};
        String[] locations = {"NY", "CA", "TX", "FL", "NJ"};

        Random rand = new Random();

        try {
            FileWriter writer = new FileWriter("transactions.csv");

            // CSV Header
            writer.append("transaction_id,card_number,timestamp,merchant,location,amount,is_fraud\n");

            for (int i = 1; i <= numTransactions; i++) {

                int transactionId = i;

                // Generate random 16 digit card number
                long cardNumber = 4000000000000000L +
                        (long)(rand.nextDouble() * 1000000000000000L);

                // Random timestamp (within last 30 days)
                LocalDateTime time = LocalDateTime.now()
                        .minusMinutes(rand.nextInt(60 * 24 * 30));

                String formattedTime = time.format(
                        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

                // Random merchant + location
                String merchant = merchants[rand.nextInt(merchants.length)];
                String location = locations[rand.nextInt(locations.length)];

                // Random amount ($1 – $2000)
                double amount = 1 + (2000 - 1) * rand.nextDouble();
                amount = Math.round(amount * 100.0) / 100.0;

                // Fraud rule (simple for now will change later)
                int isFraud = amount > 1500 ? 1 : 0;

                // Write row
                writer.append(transactionId + ","
                        + cardNumber + ","
                        + formattedTime + ","
                        + merchant + ","
                        + location + ","
                        + amount + ","
                        + isFraud + "\n");
            }

            writer.close();
            System.out.println("transactions.csv generated successfully.");

        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}